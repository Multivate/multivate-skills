from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enrollment import Enrollment
from app.models.payment import Payment, PaymentStatus
from app.models.role import UserRole
from app.models.user import User
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


def checkout_and_enroll(db: Session, user: User, payload: PaymentCreate) -> PaymentOut:
    """Record a completed payment and create the learner enrollment (replace gateway with Stripe later)."""
    if user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Checkout is only available for student accounts.",
        )
    course = course_service.get_course_or_404(db, payload.course_slug)
    existing = db.execute(
        select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled in this course")
    row = Payment(
        user_id=user.id,
        course_id=course.id,
        amount_cents=payload.amount_cents,
        currency=payload.currency.upper(),
        status=PaymentStatus.COMPLETED,
        external_ref="in_app_checkout_v1",
    )
    db.add(row)
    db.flush()
    db.add(Enrollment(user_id=user.id, course_id=course.id, lesson_done=0, progress_pct=0))
    db.commit()
    db.refresh(row)
    return payment_to_out(row)
