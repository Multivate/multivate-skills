from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.notification import Notification
from app.models.role import UserRole
from app.models.user import User
from app.schemas.notification import NotificationOut

_logger = logging.getLogger(__name__)


def inbox_href_for(user: User | None) -> str:
    if user is not None and user.role == UserRole.MENTOR:
        return "/dashboard/mentor/messages"
    return "/dashboard/messages"


def create_notification(
    db: Session,
    *,
    user_id: UUID,
    title: str,
    body: str,
    kind: str = "general",
    link_href: str | None = None,
    commit: bool = True,
) -> NotificationOut:
    row = Notification(
        user_id=user_id,
        kind=kind,
        title=title.strip(),
        body=body.strip(),
        link_href=link_href,
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    _logger.info("notification created user_id=%s kind=%s title=%s", user_id, kind, title)
    return NotificationOut.model_validate(row)


def safe_notify(
    db: Session,
    *,
    user_id: UUID | None,
    title: str,
    body: str,
    kind: str = "general",
    link_href: str | None = None,
    commit: bool = True,
) -> None:
    if user_id is None:
        return
    try:
        create_notification(
            db,
            user_id=user_id,
            title=title,
            body=body,
            kind=kind,
            link_href=link_href,
            commit=commit,
        )
    except Exception:
        _logger.exception("notification failed user_id=%s kind=%s", user_id, kind)
        if commit:
            try:
                db.rollback()
            except Exception:
                pass


def notify_admins(
    db: Session,
    *,
    title: str,
    body: str,
    kind: str,
    link_href: str | None = None,
    commit: bool = True,
) -> None:
    admins = db.scalars(select(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))).all()
    try:
        for admin in admins:
            create_notification(
                db,
                user_id=admin.id,
                title=title,
                body=body,
                kind=kind,
                link_href=link_href,
                commit=False,
            )
        if commit:
            db.commit()
        _logger.info("notifications sent to %s admin(s) kind=%s", len(admins), kind)
    except Exception:
        _logger.exception("admin notifications failed kind=%s", kind)
        if commit:
            try:
                db.rollback()
            except Exception:
                pass


def notify_new_account(db: Session, user: User) -> None:
    role = user.role
    if role == UserRole.INSTRUCTOR:
        safe_notify(
            db,
            user_id=user.id,
            kind="welcome",
            title="Welcome to Course Studio",
            body="Your instructor account is ready. Start a course whenever you like.",
            link_href="/dashboard/instructor/studio",
        )
        notify_admins(
            db,
            kind="signup_instructor",
            title="New instructor",
            body=f"{user.name} ({user.email}) just created an instructor account.",
            link_href="/dashboard/admin/instructor-profiles",
        )
        return
    if role == UserRole.MENTOR:
        safe_notify(
            db,
            user_id=user.id,
            kind="welcome",
            title="Welcome, mentor",
            body="Complete your profile so students can find you for 1:1 sessions.",
            link_href="/dashboard/mentor/profile",
        )
        notify_admins(
            db,
            kind="signup_mentor",
            title="New mentor",
            body=f"{user.name} ({user.email}) just created a mentor account.",
            link_href="/dashboard/admin/mentors",
        )
        return
    if role == UserRole.ADMIN:
        return
    safe_notify(
        db,
        user_id=user.id,
        kind="welcome",
        title="Welcome to Multivate",
        body="Your student account is ready. Pick a course and start learning.",
        link_href="/dashboard/courses",
    )
    notify_admins(
        db,
        kind="signup_student",
        title="New student",
        body=f"{user.name} ({user.email}) just joined Multivate.",
        link_href="/dashboard/admin/users",
    )


def notify_enrollment(db: Session, *, student: User, course: Course) -> None:
    safe_notify(
        db,
        user_id=student.id,
        kind="enrollment",
        title="You are enrolled",
        body=f"You are in {course.title}. Open it from your courses whenever you are ready.",
        link_href="/dashboard/courses",
    )
    if course.instructor_id and course.instructor_id != student.id:
        safe_notify(
            db,
            user_id=course.instructor_id,
            kind="new_student",
            title="New student enrolled",
            body=f"{student.name} joined {course.title}.",
            link_href="/dashboard/instructor/students",
        )


def list_notifications(db: Session, user_id: UUID, *, limit: int = 40) -> list[NotificationOut]:
    try:
        rows = db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        ).all()
        return [NotificationOut.model_validate(r) for r in rows]
    except Exception:
        _logger.exception("list notifications failed user_id=%s", user_id)
        try:
            db.rollback()
        except Exception:
            pass
        return []


def unread_count(db: Session, user_id: UUID) -> int:
    try:
        return int(
            db.scalar(
                select(func.count())
                .select_from(Notification)
                .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            )
            or 0
        )
    except Exception:
        _logger.exception("unread count failed user_id=%s", user_id)
        try:
            db.rollback()
        except Exception:
            pass
        return 0


def mark_read(db: Session, user_id: UUID, notification_id: UUID) -> NotificationOut:
    row = db.get(Notification, notification_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
        db.add(row)
        db.commit()
        db.refresh(row)
    return NotificationOut.model_validate(row)


def mark_all_read(db: Session, user_id: UUID) -> int:
    now = datetime.now(timezone.utc)
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=now)
    )
    db.commit()
    return int(result.rowcount or 0)
