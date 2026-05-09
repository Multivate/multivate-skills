from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.inbox_message import InboxMessage
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut


def send_message(db: Session, sender_id: UUID, payload: MessageCreate) -> MessageOut:
    if payload.recipient_email.lower().strip() == "":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid recipient")
    recipient = db.execute(select(User).where(User.email == payload.recipient_email)).scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user with that email")
    if recipient.id == sender_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot message yourself")
    row = InboxMessage(
        sender_id=sender_id,
        recipient_id=recipient.id,
        subject=payload.subject.strip(),
        body=payload.body.strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    sender = db.execute(select(User).where(User.id == sender_id)).scalar_one()
    return _serialize(row, viewer_id=sender_id, correspondent=recipient)


def list_inbox(db: Session, user_id: UUID) -> list[MessageOut]:
    stmt = (
        select(InboxMessage)
        .where(or_(InboxMessage.sender_id == user_id, InboxMessage.recipient_id == user_id))
        .order_by(InboxMessage.created_at.desc())
    )
    rows = db.execute(stmt).scalars().all()
    out: list[MessageOut] = []
    for row in rows:
        if row.sender_id == user_id:
            other = db.execute(select(User).where(User.id == row.recipient_id)).scalar_one()
        else:
            other = db.execute(select(User).where(User.id == row.sender_id)).scalar_one()
        out.append(_serialize(row, viewer_id=user_id, correspondent=other))
    return out


def mark_read(db: Session, user_id: UUID, message_id: UUID) -> MessageOut:
    row = db.execute(select(InboxMessage).where(InboxMessage.id == message_id)).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if row.recipient_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the recipient can mark as read")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
        db.add(row)
        db.commit()
        db.refresh(row)
    other = db.execute(select(User).where(User.id == row.sender_id)).scalar_one()
    return _serialize(row, viewer_id=user_id, correspondent=other)


def _serialize(row: InboxMessage, viewer_id: UUID, correspondent: User) -> MessageOut:
    from_me = row.sender_id == viewer_id
    return MessageOut(
        id=row.id,
        from_me=from_me,
        correspondent_name=correspondent.name,
        correspondent_email=correspondent.email,
        subject=row.subject,
        body=row.body,
        read_at=row.read_at,
        created_at=row.created_at,
    )
