from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.lesson import LessonCreate, LessonOut, LessonUpdate
from app.services import course_service


def _sync_lessons_count(db: Session, course_id: UUID) -> None:
    n = db.execute(select(func.count()).select_from(Lesson).where(Lesson.course_id == course_id)).scalar_one()
    c = db.get(Course, course_id)
    if c is not None:
        c.lessons_count = int(n)
        db.add(c)


def lesson_to_out(lesson: Lesson) -> LessonOut:
    return LessonOut.model_validate(lesson)


def list_lessons(db: Session, course_slug: str) -> list[LessonOut]:
    course = course_service.get_course_or_404(db, course_slug)
    rows = (
        db.execute(select(Lesson).where(Lesson.course_id == course.id).order_by(Lesson.position, Lesson.created_at))
        .scalars()
        .all()
    )
    return [lesson_to_out(x) for x in rows]


def get_lesson(db: Session, course_slug: str, lesson_id: UUID) -> LessonOut:
    course = course_service.get_course_or_404(db, course_slug)
    row = db.execute(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.course_id == course.id)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson_to_out(row)


def _next_position(db: Session, course_id: UUID) -> int:
    m = db.execute(select(func.max(Lesson.position)).where(Lesson.course_id == course_id)).scalar_one()
    if m is None:
        return 0
    return int(m) + 1


def create_lesson(db: Session, course_slug: str, payload: LessonCreate, actor: User) -> LessonOut:
    course = course_service.get_course_or_404(db, course_slug)
    course_service.assert_can_manage_course(actor, course)
    pos = payload.position if payload.position is not None else _next_position(db, course.id)
    row = Lesson(
        course_id=course.id,
        position=pos,
        title=payload.title,
        body=payload.body,
        duration_minutes=payload.duration_minutes,
    )
    db.add(row)
    db.flush()
    _sync_lessons_count(db, course.id)
    db.commit()
    db.refresh(row)
    return lesson_to_out(row)


def update_lesson(db: Session, course_slug: str, lesson_id: UUID, payload: LessonUpdate, actor: User) -> LessonOut:
    course = course_service.get_course_or_404(db, course_slug)
    course_service.assert_can_manage_course(actor, course)
    row = db.execute(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.course_id == course.id)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if payload.position is not None:
        row.position = payload.position
    if payload.title is not None:
        row.title = payload.title
    if payload.body is not None:
        row.body = payload.body
    if payload.duration_minutes is not None:
        row.duration_minutes = payload.duration_minutes
    db.add(row)
    db.flush()
    _sync_lessons_count(db, course.id)
    db.commit()
    db.refresh(row)
    return lesson_to_out(row)


def delete_lesson(db: Session, course_slug: str, lesson_id: UUID, actor: User) -> None:
    course = course_service.get_course_or_404(db, course_slug)
    course_service.assert_can_manage_course(actor, course)
    row = db.execute(
        select(Lesson).where(Lesson.id == lesson_id, Lesson.course_id == course.id)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    db.delete(row)
    db.flush()
    _sync_lessons_count(db, course.id)
    db.commit()
