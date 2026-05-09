from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.course_review import CourseReview
from app.models.enrollment import Enrollment
from app.models.role import UserRole
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut


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
