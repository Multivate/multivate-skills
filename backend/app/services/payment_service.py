from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.role import UserRole
from app.models.user import User
from app.schemas.bank_transfer import EnrollmentStartOut
from app.schemas.payment import PaymentCreate, PaymentOut


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
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Do not create invoices with a client amount. Start enrollment so the server sets the price.",
    )


def checkout_and_enroll(db: Session, user: User, payload: PaymentCreate) -> EnrollmentStartOut:
    """Never trust client amount_cents or currency. Server prices the course."""
    from app.services import bank_transfer_service

    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Checkout is only available for student accounts.",
        )
    return bank_transfer_service.start_enrollment(db, user, payload.course_slug)
