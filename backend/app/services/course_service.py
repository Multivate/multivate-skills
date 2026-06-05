from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache_service import CATALOG_KEY, cache_get_json, cache_set_json, invalidate_catalog_cache
from app.models.course import Course
from app.models.course_status import CourseStatus
from app.models.role import UserRole
from app.models.user import User
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate


def course_to_out(course: Course) -> CourseOut:
    row = CourseOut.model_validate(course)
    return row.model_copy(
        update={
            "level": course.level.value,
            "status": course.status.value,
        }
    )


def list_catalog(db: Session) -> list[CourseOut]:
    cached = cache_get_json(CATALOG_KEY)
    if isinstance(cached, list):
        return [CourseOut.model_validate(item) for item in cached]

    rows = db.execute(
        select(Course)
        .where(Course.status == CourseStatus.PUBLISHED)
        .order_by(Course.title.asc())
    ).scalars().all()
    out = [course_to_out(c) for c in rows]
    cache_set_json(CATALOG_KEY, [item.model_dump(mode="json") for item in out], ttl_seconds=60)
    return out


def get_course_by_slug(db: Session, slug: str) -> Course | None:
    return db.execute(select(Course).where(Course.slug == slug)).scalar_one_or_none()


def get_course_or_404(db: Session, slug: str, *, user: User | None = None) -> Course:
    c = get_course_by_slug(db, slug)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if c.status != CourseStatus.PUBLISHED:
        if user and (
            user.role == UserRole.ADMIN
            or (user.role == UserRole.INSTRUCTOR and c.instructor_id == user.id)
        ):
            return c
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return c


def _can_manage_course(user: User, course: Course) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role != UserRole.INSTRUCTOR:
        return False
    return course.instructor_id is not None and course.instructor_id == user.id


def assert_can_manage_course(user: User, course: Course) -> None:
    if not _can_manage_course(user, course):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage this course")


def create_course(db: Session, payload: CourseCreate, actor: User) -> CourseOut:
    if get_course_by_slug(db, payload.slug):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already in use")

    instructor_id: UUID | None
    if actor.role == UserRole.ADMIN:
        instructor_id = payload.instructor_id
    elif actor.role == UserRole.INSTRUCTOR:
        instructor_id = actor.id
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    c = Course(
        slug=payload.slug,
        title=payload.title,
        description=payload.description,
        image_url=payload.image_url or "",
        lessons_count=payload.lessons_count,
        instructor_id=instructor_id,
        status=CourseStatus.DRAFT,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return course_to_out(c)


def update_course(db: Session, slug: str, payload: CourseUpdate, actor: User) -> CourseOut:
    c = get_course_by_slug(db, slug)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    assert_can_manage_course(actor, c)

    if payload.title is not None:
        c.title = payload.title
    if payload.description is not None:
        c.description = payload.description
    if payload.image_url is not None:
        c.image_url = payload.image_url
    if payload.lessons_count is not None:
        c.lessons_count = payload.lessons_count
    if payload.instructor_id is not None:
        if actor.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins may reassign instructor",
            )
        c.instructor_id = payload.instructor_id

    db.add(c)
    db.commit()
    db.refresh(c)
    return course_to_out(c)


def get_course_for_management(db: Session, slug: str, actor: User) -> Course:
    c = get_course_by_slug(db, slug)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    assert_can_manage_course(actor, c)
    return c


def delete_course(db: Session, slug: str, actor: User) -> None:
    if actor.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins may delete courses")
    c = get_course_by_slug(db, slug)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    db.delete(c)
    db.commit()
    invalidate_catalog_cache()
