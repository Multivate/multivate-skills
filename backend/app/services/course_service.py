from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.cache_service import CATALOG_KEY, cache_get_json, cache_set_json, invalidate_catalog_cache
from app.models.course import Course
from app.models.course_review import CourseReview
from app.models.course_status import CourseStatus
from app.models.enrollment import Enrollment
from app.models.enrollment_status import EnrollmentStatus
from app.models.role import UserRole
from app.models.user import User
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate
from app.services.course_pricing import sale_price_cents


def course_to_out(course: Course) -> CourseOut:
    row = CourseOut.model_validate(course)
    duration = course.duration_minutes
    if duration <= 0 and course.lessons_count > 0:
        duration = max(1, course.lessons_count)
    return row.model_copy(
        update={
            "level": course.level.value if hasattr(course.level, "value") else str(course.level or "beginner"),
            "status": course.status.value if hasattr(course.status, "value") else str(course.status or "draft"),
            "duration_minutes": duration,
            "discount_percent": int(getattr(course, "discount_percent", 0) or 0),
            "discount_expires_at": getattr(course, "discount_expires_at", None),
            "sale_price_cents": sale_price_cents(course),
        }
    )


def _with_public_stats(db: Session, courses: list[Course]) -> list[CourseOut]:
    if not courses:
        return []
    ids = [course.id for course in courses]
    instructor_ids = {course.instructor_id for course in courses if course.instructor_id}
    names: dict[UUID, str] = {}
    if instructor_ids:
        names = dict(db.execute(select(User.id, User.name).where(User.id.in_(instructor_ids))).all())

    ratings = {
        row[0]: (round(float(row[1] or 0), 1), int(row[2] or 0))
        for row in db.execute(
            select(CourseReview.course_id, func.avg(CourseReview.rating), func.count(CourseReview.id))
            .where(CourseReview.course_id.in_(ids))
            .group_by(CourseReview.course_id)
        ).all()
    }
    published_ids = list(
        db.scalars(select(Course.id).where(Course.status == CourseStatus.PUBLISHED)).all()
    )
    enrollments = {
        row[0]: int(row[1] or 0)
        for row in db.execute(
            select(Enrollment.course_id, func.count(Enrollment.id))
            .where(
                Enrollment.course_id.in_(published_ids or ids),
                Enrollment.status == EnrollmentStatus.ENROLLED,
            )
            .group_by(Enrollment.course_id)
        ).all()
    }
    top = max(enrollments.values(), default=0)

    enriched: list[CourseOut] = []
    for course in courses:
        average, count = ratings.get(course.id, (0.0, 0))
        enrolled = enrollments.get(course.id, 0)
        enriched.append(
            course_to_out(course).model_copy(
                update={
                    "instructor_name": names.get(course.instructor_id) if course.instructor_id else None,
                    "average_rating": average if count else None,
                    "rating_count": count,
                    "is_bestseller": top > 0 and enrolled == top,
                }
            )
        )
    return enriched


def list_catalog(db: Session) -> list[CourseOut]:
    cached = cache_get_json(CATALOG_KEY)
    if isinstance(cached, list):
        return [CourseOut.model_validate(item) for item in cached]

    rows = db.execute(
        select(Course)
        .where(Course.status == CourseStatus.PUBLISHED)
        .order_by(Course.title.asc())
    ).scalars().all()
    out = _with_public_stats(db, list(rows))
    cache_set_json(CATALOG_KEY, [item.model_dump(mode="json") for item in out], ttl_seconds=60)
    return out


def public_course_out(db: Session, course: Course) -> CourseOut:
    return _with_public_stats(db, [course])[0]


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
    c = get_course_by_slug(db, slug)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    assert_can_manage_course(actor, c)
    db.delete(c)
    db.commit()
    invalidate_catalog_cache()
