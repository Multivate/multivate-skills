from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.certificate import CertificateOut
from app.schemas.learning import MyCourseItem, ProgressUpdate
from app.services import certificate_service, learning_service

router = APIRouter(prefix="/learning", tags=["learning"])


@router.get("/my-courses", response_model=list[MyCourseItem])
def read_my_courses(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[MyCourseItem]:
    """Return the signed-in learner's enrollments joined to course catalog rows."""
    return learning_service.list_my_courses(db, user.id)


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
