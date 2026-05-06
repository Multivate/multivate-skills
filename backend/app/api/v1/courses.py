from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate
from app.services import course_service

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseOut])
def list_courses(db: Annotated[Session, Depends(get_db)]) -> list[CourseOut]:
    return course_service.list_catalog(db)


@router.get("/{slug}", response_model=CourseOut)
def get_course(slug: str, db: Annotated[Session, Depends(get_db)]) -> CourseOut:
    return course_service.course_to_out(course_service.get_course_or_404(db, slug))


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseOut:
    return course_service.create_course(db, payload, user)


@router.patch("/{slug}", response_model=CourseOut)
def patch_course(
    slug: str,
    payload: CourseUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR, UserRole.ADMIN))],
) -> CourseOut:
    return course_service.update_course(db, slug, payload, user)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def remove_course(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    course_service.delete_course(db, slug, user)
