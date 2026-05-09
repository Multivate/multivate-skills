from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enrollment import Enrollment
from app.models.role import UserRole
from app.models.user import User
from app.services import course_service


def enroll_by_slug(db: Session, user: User, course_slug: str) -> None:
    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can enroll in courses as learners.",
        )
    course = course_service.get_course_or_404(db, course_slug)
    existing = db.execute(
        select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled")
    db.add(Enrollment(user_id=user.id, course_id=course.id, lesson_done=0, progress_pct=0))
    db.commit()


def unenroll_by_slug(db: Session, user: User, course_slug: str) -> None:
    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can manage learner enrollments.",
        )
    course = course_service.get_course_or_404(db, course_slug)
    row = db.execute(
        select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    db.delete(row)
    db.commit()
