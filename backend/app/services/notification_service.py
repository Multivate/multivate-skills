from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.role import UserRole
from app.models.user import User
from app.schemas.notification import NotificationOut

_logger = logging.getLogger(__name__)


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


def notify_admins(
    db: Session,
    *,
    title: str,
    body: str,
    kind: str,
    link_href: str | None = None,
) -> None:
    admins = db.scalars(select(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))).all()
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
    db.commit()
    _logger.info("notifications sent to %s admin(s) kind=%s", len(admins), kind)


def list_notifications(db: Session, user_id: UUID, *, limit: int = 40) -> list[NotificationOut]:
    rows = db.scalars(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    ).all()
    return [NotificationOut.model_validate(r) for r in rows]


def unread_count(db: Session, user_id: UUID) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        or 0
    )


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
