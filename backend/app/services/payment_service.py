from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services import course_service


def payment_to_out(p: Payment) -> PaymentOut:
    return PaymentOut.model_validate(p)


def list_my_payments(db: Session, user_id: UUID) -> list[PaymentOut]:
    rows = (
        db.execute(select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc()))
        .scalars()
        .all()
    )
    return [payment_to_out(x) for x in rows]


def create_payment(db: Session, user_id: UUID, payload: PaymentCreate) -> PaymentOut:
    course = course_service.get_course_or_404(db, payload.course_slug)
    row = Payment(
        user_id=user_id,
        course_id=course.id,
        amount_cents=payload.amount_cents,
        currency=payload.currency.upper(),
        status=PaymentStatus.PENDING,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return payment_to_out(row)
