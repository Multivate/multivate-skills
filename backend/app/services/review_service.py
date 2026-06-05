from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.cache_service import REVIEWS_PUBLIC_PREFIX, cache_get_json, cache_set_json, invalidate_public_reviews_cache
from app.models.course import Course
from app.models.course_review import CourseReview
from app.models.course_status import CourseStatus
from app.models.enrollment import Enrollment
from app.models.role import UserRole
from app.models.user import User
from app.schemas.review import PublicReviewOut, ReviewCreate, ReviewOut


def upsert_review(db: Session, user_id: UUID, payload: ReviewCreate) -> ReviewOut:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user or user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only learner accounts can submit course reviews.",
        )
    course = db.execute(select(Course).where(Course.slug == payload.course_slug)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    enr = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if not enr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enroll in this course before leaving a review.",
        )
    existing = db.execute(
        select(CourseReview).where(CourseReview.user_id == user_id, CourseReview.course_id == course.id)
    ).scalar_one_or_none()
    if existing:
        existing.rating = payload.rating
        existing.comment = payload.comment
        row = existing
    else:
        row = CourseReview(user_id=user_id, course_id=course.id, rating=payload.rating, comment=payload.comment)
        db.add(row)
    db.commit()
    db.refresh(row)
    invalidate_public_reviews_cache()
    return _to_out(row, course, user)


def _to_out(row: CourseReview, course: Course, reviewer: User) -> ReviewOut:
    return ReviewOut(
        id=row.id,
        course_slug=course.slug,
        course_title=course.title,
        reviewer_name=reviewer.name,
        reviewer_email=reviewer.email,
        rating=row.rating,
        comment=row.comment,
        created_at=row.created_at,
    )


def _display_name(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "Learner"
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


def list_public_testimonials(db: Session, *, limit: int = 12) -> list[PublicReviewOut]:
    cache_key = f"{REVIEWS_PUBLIC_PREFIX}{limit}"
    cached = cache_get_json(cache_key)
    if isinstance(cached, list):
        return [PublicReviewOut.model_validate(item) for item in cached]

    stmt = (
        select(CourseReview, Course, User)
        .join(Course, Course.id == CourseReview.course_id)
        .join(User, User.id == CourseReview.user_id)
        .where(Course.status == CourseStatus.PUBLISHED)
        .where(CourseReview.comment.isnot(None))
        .where(CourseReview.comment != "")
        .order_by(CourseReview.created_at.desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    out: list[PublicReviewOut] = []
    for review, course, reviewer in rows:
        comment = (review.comment or "").strip()
        if not comment:
            continue
        out.append(
            PublicReviewOut(
                id=review.id,
                course_slug=course.slug,
                course_title=course.title,
                reviewer_display_name=_display_name(reviewer.name),
                rating=review.rating,
                comment=comment,
                created_at=review.created_at,
            )
        )
    cache_set_json(cache_key, [item.model_dump(mode="json") for item in out], ttl_seconds=120)
    return out


def list_instructor_reviews(db: Session, instructor_id: UUID) -> list[ReviewOut]:
    stmt = (
        select(CourseReview, Course, User)
        .join(Course, Course.id == CourseReview.course_id)
        .join(User, User.id == CourseReview.user_id)
        .where(Course.instructor_id == instructor_id)
        .order_by(CourseReview.created_at.desc())
    )
    rows = db.execute(stmt).all()
    return [_to_out(r, c, u) for r, c, u in rows]
