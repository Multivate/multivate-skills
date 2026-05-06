from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enrollment import Enrollment
from app.services import course_service


def enroll_by_slug(db: Session, user_id: UUID, course_slug: str) -> None:
    course = course_service.get_course_or_404(db, course_slug)
    existing = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled")
    db.add(Enrollment(user_id=user_id, course_id=course.id, lesson_done=0, progress_pct=0))
    db.commit()


def unenroll_by_slug(db: Session, user_id: UUID, course_slug: str) -> None:
    course = course_service.get_course_or_404(db, course_slug)
    row = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    db.delete(row)
    db.commit()
