from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.role import UserRole
from app.models.user import User
from app.schemas.certificate import CertificateOut
from app.schemas.learning import (
    LearningHabitsOut,
    LearningHabitsPatch,
    LearningListCreate,
    LearningListOut,
    LearningVisitIn,
    LibraryCourseIn,
    LibraryCourseOut,
    MyCourseItem,
    ProgressUpdate,
    RecommendedCourseOut,
    WeeklyCourseTargetIn,
    WeeklyCourseTargetOut,
)
from app.services import certificate_service, learning_habit_service, learning_service, library_service, recommendation_service

router = APIRouter(prefix="/learning", tags=["learning"])


@router.get("/my-courses", response_model=list[MyCourseItem])
def read_my_courses(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[MyCourseItem]:
    """Return the signed-in learner's enrollments joined to course catalog rows."""
    return learning_service.list_my_courses(db, user.id)


@router.get("/weekly-target", response_model=WeeklyCourseTargetOut)
def read_weekly_target(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> WeeklyCourseTargetOut:
    return learning_service.get_weekly_course_target(db, user.id)


@router.patch("/weekly-target", response_model=WeeklyCourseTargetOut)
def patch_weekly_target(
    body: WeeklyCourseTargetIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> WeeklyCourseTargetOut:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    return learning_service.set_weekly_course_target(db, user.id, body.weekly_course_target)


@router.get("/habits", response_model=LearningHabitsOut)
def read_habits(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    local_date: Annotated[str, Query(min_length=10, max_length=10)],
) -> LearningHabitsOut:
    return learning_habit_service.get_habits(db, user.id, local_date)


@router.patch("/habits", response_model=LearningHabitsOut)
def patch_habits(
    body: LearningHabitsPatch,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    local_date: Annotated[str, Query(min_length=10, max_length=10)],
) -> LearningHabitsOut:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    return learning_habit_service.patch_habits(db, user.id, local_date, body)


@router.post("/visit", response_model=LearningHabitsOut)
def post_visit(
    body: LearningVisitIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LearningHabitsOut:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    return learning_habit_service.record_visit(db, user.id, body.local_date)


@router.get("/recommendations", response_model=list[RecommendedCourseOut])
def read_recommendations(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=24)] = 8,
) -> list[RecommendedCourseOut]:
    """Suggest published courses from the learner's onboarding profile."""
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")
    return recommendation_service.list_recommendations(db, user.id, limit=limit)


@router.patch("/progress/{course_slug}", response_model=MyCourseItem)
def patch_progress(
    course_slug: str,
    body: ProgressUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> MyCourseItem:
    """Update lesson_done / progress_pct for the caller's enrollment."""
    return learning_service.update_progress(db, user.id, course_slug, body)


@router.get("/certificates/me", response_model=list[CertificateOut])
def list_my_certificates(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[CertificateOut]:
    return certificate_service.list_my_certificates(db, user.id)


@router.post("/certificates/{course_slug}/issue", response_model=CertificateOut)
def issue_certificate(
    course_slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> CertificateOut:
    """Issue (or return existing) certificate when enrollment is 100% complete."""
    return certificate_service.issue_for_course(db, user.id, course_slug)


def _students_only(user: User) -> None:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students only")


@router.get("/wishlist", response_model=list[LibraryCourseOut])
def read_wishlist(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[LibraryCourseOut]:
    _students_only(user)
    return library_service.list_wishlist(db, user.id)


@router.post("/wishlist", response_model=list[LibraryCourseOut])
def post_wishlist(
    body: LibraryCourseIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[LibraryCourseOut]:
    _students_only(user)
    return library_service.add_wishlist(db, user.id, body.course_slug)


@router.delete("/wishlist/{course_slug}", response_model=list[LibraryCourseOut])
def delete_wishlist(
    course_slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[LibraryCourseOut]:
    _students_only(user)
    return library_service.remove_wishlist(db, user.id, course_slug)


@router.get("/lists", response_model=list[LearningListOut])
def read_lists(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[LearningListOut]:
    _students_only(user)
    return library_service.list_lists(db, user.id)


@router.post("/lists", response_model=LearningListOut)
def post_list(
    body: LearningListCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LearningListOut:
    _students_only(user)
    return library_service.create_list(db, user.id, body.title)


@router.patch("/lists/{list_id}", response_model=LearningListOut)
def patch_list(
    list_id: UUID,
    body: LearningListCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LearningListOut:
    _students_only(user)
    return library_service.rename_list(db, user.id, list_id, body.title)


@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Response:
    _students_only(user)
    library_service.delete_list(db, user.id, list_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/lists/{list_id}/courses", response_model=LearningListOut)
def post_list_course(
    list_id: UUID,
    body: LibraryCourseIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LearningListOut:
    _students_only(user)
    return library_service.add_list_course(db, user.id, list_id, body.course_slug)


@router.delete("/lists/{list_id}/courses/{course_slug}", response_model=LearningListOut)
def delete_list_course(
    list_id: UUID,
    course_slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LearningListOut:
    _students_only(user)
    return library_service.remove_list_course(db, user.id, list_id, course_slug)
