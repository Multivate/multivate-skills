from __future__ import annotations

import re
from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.learning_visit import LearningVisit
from app.models.student_learning_profile import StudentLearningProfile
from app.schemas.learning import LearningHabitsOut, LearningHabitsPatch
from app.services.learning_intent import intent_from_profile
from app.services.learning_service import get_student_profile

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_local_date(raw: str) -> date:
    if not _DATE_RE.match(raw or ""):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid date")
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid date") from exc


def _week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _parse_days(raw: str | None) -> list[int]:
    if not raw:
        return []
    out: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            value = int(part)
        except ValueError:
            continue
        if 1 <= value <= 7 and value not in out:
            out.append(value)
    return out


def _get_or_create_visit(db: Session, user_id: UUID, day: date) -> LearningVisit:
    row = db.scalar(
        select(LearningVisit).where(LearningVisit.user_id == user_id, LearningVisit.visited_on == day)
    )
    if row:
        return row
    try:
        with db.begin_nested():
            row = LearningVisit(user_id=user_id, visited_on=day, watch_seconds=0)
            db.add(row)
            db.flush()
            return row
    except IntegrityError:
        existing = db.scalar(
            select(LearningVisit).where(LearningVisit.user_id == user_id, LearningVisit.visited_on == day)
        )
        if existing is None:
            raise
        return existing


def record_visit(db: Session, user_id: UUID, local_date: str) -> LearningHabitsOut:
    day = parse_local_date(local_date)
    _get_or_create_visit(db, user_id, day)
    db.commit()
    return get_habits(db, user_id, local_date)


def add_watch_seconds(db: Session, user_id: UUID, day: date, seconds: int) -> None:
    if seconds <= 0:
        return
    row = _get_or_create_visit(db, user_id, day)
    row.watch_seconds = int(row.watch_seconds or 0) + seconds
    db.add(row)


def _streak_weeks(visit_days: set[date], today: date) -> int:
    """Completed Monday–Sunday weeks with at least one visit, counting backwards from last week."""
    visited_weeks = {_week_start(day) for day in visit_days}
    cursor = _week_start(today) - timedelta(days=7)
    streak = 0
    while cursor in visited_weeks:
        streak += 1
        cursor -= timedelta(days=7)
    return streak


def get_habits(db: Session, user_id: UUID, local_date: str) -> LearningHabitsOut:
    day = parse_local_date(local_date)
    week_start = _week_start(day)
    week_end = week_start + timedelta(days=6)
    rows = list(db.scalars(select(LearningVisit).where(LearningVisit.user_id == user_id)).all())
    visit_days = {row.visited_on for row in rows}
    week_rows = [row for row in rows if week_start <= row.visited_on <= week_end]
    profile = get_student_profile(db, user_id)
    intent = intent_from_profile(profile)
    days = _parse_days(getattr(profile, "reminder_days", None) if profile else None)
    time_value = getattr(profile, "reminder_time", None) if profile else None
    minutes_goal = intent.week_minutes
    dismissed = bool(getattr(profile, "reminder_dismissed", False)) if profile else False
    minutes_this_week = sum(int(row.watch_seconds or 0) for row in week_rows) // 60
    return LearningHabitsOut(
        local_date=day.isoformat(),
        week_start=week_start.isoformat(),
        week_end=week_end.isoformat(),
        streak_weeks=_streak_weeks(visit_days, day),
        visits_this_week=len({row.visited_on for row in week_rows}),
        visit_goal=intent.week_days,
        visited_today=day in visit_days,
        minutes_this_week=minutes_this_week,
        minutes_goal=minutes_goal,
        reminder_days=days,
        reminder_time=time_value,
        reminder_dismissed=dismissed,
        reminder_enabled=bool(days and time_value) and not dismissed,
    )


def _ensure_profile(db: Session, user_id: UUID) -> StudentLearningProfile:
    row = get_student_profile(db, user_id)
    if row is None:
        row = StudentLearningProfile(user_id=user_id)
        db.add(row)
        db.flush()
    return row


def patch_habits(db: Session, user_id: UUID, local_date: str, payload: LearningHabitsPatch) -> LearningHabitsOut:
    row = _ensure_profile(db, user_id)
    if payload.reminder_days is not None:
        cleaned = sorted({int(value) for value in payload.reminder_days if 1 <= int(value) <= 7})
        row.reminder_days = ",".join(str(value) for value in cleaned) if cleaned else None
        if cleaned:
            row.reminder_dismissed = False
    if payload.reminder_time is not None:
        value = payload.reminder_time.strip()
        if value == "":
            row.reminder_time = None
        elif not _TIME_RE.match(value):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Time must be HH:MM")
        else:
            row.reminder_time = value
            row.reminder_dismissed = False
    if payload.reminder_minutes is not None:
        row.reminder_minutes = max(15, min(180, int(payload.reminder_minutes)))
    if payload.reminder_dismissed is not None:
        row.reminder_dismissed = bool(payload.reminder_dismissed)
        if row.reminder_dismissed:
            pass
    db.add(row)
    db.commit()
    return get_habits(db, user_id, local_date)
