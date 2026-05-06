from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.lesson import Lesson
from app.schemas.learning import MyCourseItem, ProgressUpdate


def _my_course_item(course: Course, enr: Enrollment) -> MyCourseItem:
    status_label = "Not Started" if enr.lesson_done == 0 and enr.progress_pct == 0 else "In Progress"
    return MyCourseItem(
        slug=course.slug,
        title=course.title,
        description=course.description,
        image_url=course.image_url,
        image_alt=course.title,
        lessons=course.lessons_count,
        lesson_done=enr.lesson_done,
        progress_pct=enr.progress_pct,
        status=status_label,
    )


def list_my_courses(db: Session, user_id: UUID) -> list[MyCourseItem]:
    stmt = (
        select(Course, Enrollment)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .where(Enrollment.user_id == user_id)
        .order_by(Enrollment.created_at.desc())
    )
    rows = db.execute(stmt).all()
    return [_my_course_item(course, enr) for course, enr in rows]


def _max_lessons_for_course(db: Session, course: Course) -> int:
    n = db.execute(select(func.count()).select_from(Lesson).where(Lesson.course_id == course.id)).scalar_one()
    return max(int(n), course.lessons_count)


def update_progress(db: Session, user_id: UUID, course_slug: str, payload: ProgressUpdate) -> MyCourseItem:
    course = db.execute(select(Course).where(Course.slug == course_slug)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    enr = db.execute(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not enrolled in this course")

    cap = _max_lessons_for_course(db, course)
    if payload.lesson_done is not None:
        enr.lesson_done = min(max(payload.lesson_done, 0), cap)
    if payload.progress_pct is not None:
        enr.progress_pct = min(max(payload.progress_pct, 0), 100)

    db.add(enr)
    db.commit()
    db.refresh(enr)
    return _my_course_item(course, enr)
