from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.lesson import LessonCreate, LessonOut, LessonUpdate
from app.services import lesson_service

router = APIRouter(prefix="/courses", tags=["lessons"])


@router.get("/{course_slug}/lessons", response_model=list[LessonOut])
def list_lessons(course_slug: str, db: Annotated[Session, Depends(get_db)]) -> list[LessonOut]:
    return lesson_service.list_lessons(db, course_slug)


@router.get("/{course_slug}/lessons/{lesson_id}", response_model=LessonOut)
def get_lesson(course_slug: str, lesson_id: UUID, db: Annotated[Session, Depends(get_db)]) -> LessonOut:
    return lesson_service.get_lesson(db, course_slug, lesson_id)


@router.post(
    "/{course_slug}/lessons",
    response_model=LessonOut,
    status_code=status.HTTP_201_CREATED,
)
def create_lesson(
    course_slug: str,
    payload: LessonCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LessonOut:
    return lesson_service.create_lesson(db, course_slug, payload, user)


@router.patch("/{course_slug}/lessons/{lesson_id}", response_model=LessonOut)
def patch_lesson(
    course_slug: str,
    lesson_id: UUID,
    payload: LessonUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> LessonOut:
    return lesson_service.update_lesson(db, course_slug, lesson_id, payload, user)


@router.delete("/{course_slug}/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_lesson(
    course_slug: str,
    lesson_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    lesson_service.delete_lesson(db, course_slug, lesson_id, user)
