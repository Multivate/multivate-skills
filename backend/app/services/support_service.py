from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.support_ticket import SupportTicket
from app.models.user import User
from app.schemas.support import SupportTicketCreate, SupportTicketOut


def list_my_tickets(db: Session, user_id) -> list[SupportTicketOut]:
    rows = list(
        db.scalars(
            select(SupportTicket).where(SupportTicket.user_id == user_id).order_by(SupportTicket.created_at.desc())
        ).all()
    )
    return [
        SupportTicketOut(
            id=row.id,
            subject=row.subject,
            body=row.body,
            status=row.status,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in rows
    ]


def create_ticket(db: Session, user: User, payload: SupportTicketCreate) -> SupportTicketOut:
    row = SupportTicket(
        user_id=user.id,
        subject=payload.subject.strip(),
        body=payload.body.strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SupportTicketOut(
        id=row.id,
        subject=row.subject,
        body=row.body,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
