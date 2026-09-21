from __future__ import annotations

import json
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.mentor_profile import MentorApprovalStatus, MentorProfile
from app.models.mentor_session import (
    SESSION_DURATION_MINUTES,
    MentorSessionBooking,
    MentorSessionStatus,
    MentorSessionTier,
)
from app.models.payment import Payment, PaymentStatus
from app.models.role import UserRole
from app.models.user import User
from app.schemas.bank_transfer import BankTransferInstructions, RemitaCheckout
from app.schemas.mentor_session import (
    MentorSessionBookingOut,
    MentorSessionStartIn,
    MentorSessionStartOut,
    MentorSessionTierOut,
)
from app.services import remita_service
from app.services.bank_transfer_service import (
    _audit,
    _new_payment_reference,
    _payment_out,
    _remita_checkout_for,
    ensure_student_code,
)

_logger = logging.getLogger(__name__)

_TIER_META: dict[MentorSessionTier, tuple[str, str]] = {
    MentorSessionTier.STANDARD: (
        "Standard",
        "Solid German practice with an approved Multivate mentor.",
    ),
    MentorSessionTier.PROFESSIONAL: (
        "Professional",
        "Experienced mentor for career and exam-focused sessions.",
    ),
    MentorSessionTier.NATIVE_PROFESSIONAL: (
        "Native Professional",
        "Highest tier — native-level German with professional coaching.",
    ),
}


def _tier_rate_cents(tier: MentorSessionTier) -> tuple[int, str]:
    s = get_settings()
    currency = (s.mentor_session_currency or s.bank_transfer_currency or "NGN").upper()
    if tier == MentorSessionTier.STANDARD:
        return int(s.mentor_tier_standard_cents), currency
    if tier == MentorSessionTier.PROFESSIONAL:
        return int(s.mentor_tier_professional_cents), currency
    return int(s.mentor_tier_native_professional_cents), currency


def list_session_tiers() -> list[MentorSessionTierOut]:
    rows: list[MentorSessionTierOut] = []
    for tier in MentorSessionTier:
        label, description = _TIER_META[tier]
        amount, currency = _tier_rate_cents(tier)
        rows.append(
            MentorSessionTierOut(
                tier=tier,
                label=label,
                description=description,
                amount_cents=amount,
                currency=currency,
                duration_minutes=SESSION_DURATION_MINUTES,
                billed_hours=1,
            )
        )
    return rows


def _booking_out(db: Session, booking: MentorSessionBooking) -> MentorSessionBookingOut:
    mentor_slug = None
    mentor_name = None
    if booking.mentor_profile_id:
        mentor = db.get(MentorProfile, booking.mentor_profile_id)
        if mentor:
            mentor_slug = mentor.slug
            mentor_name = mentor.full_name
    return MentorSessionBookingOut(
        id=booking.id,
        tier=booking.tier,
        status=booking.status,
        duration_minutes=booking.duration_minutes,
        billed_hours=booking.billed_hours,
        amount_cents=booking.amount_cents,
        currency=booking.currency,
        course_slug=booking.course_slug,
        preferred_time_note=booking.preferred_time_note,
        scheduled_at=booking.scheduled_at,
        meeting_url=booking.meeting_url,
        mentor_slug=mentor_slug,
        mentor_name=mentor_name,
        created_at=booking.created_at,
    )


def _session_label(tier: MentorSessionTier, mentor: MentorProfile | None) -> str:
    label = _TIER_META[tier][0]
    if mentor:
        return f"1:1 {label} · {mentor.full_name}"
    return f"1:1 {label} German session"


def _instructions_for_session(
    payment: Payment,
    *,
    student_code: str,
    title: str,
    slug: str,
) -> BankTransferInstructions:
    s = get_settings()
    return BankTransferInstructions(
        bank_name=s.bank_name,
        account_name=s.bank_account_name,
        account_number=s.bank_account_number,
        amount_cents=payment.amount_cents,
        currency=payment.currency.upper(),
        payment_reference=payment.payment_reference or "",
        student_code=student_code,
        course_title=title,
        course_slug=slug,
        original_amount_cents=payment.original_amount_cents,
        discount_cents=payment.discount_cents or 0,
        coupon_code=payment.coupon_code,
    )


def _ensure_remita_for_session(db: Session, payment: Payment, user: User, description: str) -> RemitaCheckout:
    if payment.transaction_reference and payment.payment_method == "remita":
        return _remita_checkout_for(payment)
    try:
        rrr_payload = remita_service.generate_rrr(
            order_id=payment.payment_reference or str(payment.id),
            amount_cents=payment.amount_cents,
            payer_name=user.name,
            payer_email=user.email,
            payer_phone=remita_service.normalize_phone(None),
            description=description[:120],
        )
    except Exception as exc:
        _logger.exception("Remita RRR failed for mentor session payment_ref=%s", payment.payment_reference)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't start online payment right now. Please try again shortly.",
        ) from exc

    rrr = str(rrr_payload.get("RRR") or rrr_payload.get("rrr") or "").strip()
    payment.payment_method = "remita"
    payment.transaction_reference = rrr
    payment.external_ref = payment.payment_reference
    payment.verification_response = json.dumps({"rrr_init": rrr_payload, "kind": "mentor_session"})
    db.add(payment)
    db.flush()
    _audit(db, payment.id, user.id, "remita_rrr_created", f"rrr={rrr};kind=mentor_session")
    return _remita_checkout_for(payment)


def start_session(db: Session, user: User, body: MentorSessionStartIn) -> MentorSessionStartOut:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can book 1:1 sessions")

    mentor: MentorProfile | None = None
    if body.mentor_slug:
        mentor = db.execute(
            select(MentorProfile).where(MentorProfile.slug == body.mentor_slug.strip().lower())
        ).scalar_one_or_none()
        if not mentor or mentor.approval_status != MentorApprovalStatus.APPROVED:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mentor not found")

    rate_cents, currency = _tier_rate_cents(body.tier)
    amount_cents = rate_cents * int(body.billed_hours)
    duration = SESSION_DURATION_MINUTES * int(body.billed_hours)
    title = _session_label(body.tier, mentor)
    slug = mentor.slug if mentor else "mentor-session"

    student_code = ensure_student_code(db, user)
    booking = MentorSessionBooking(
        student_id=user.id,
        mentor_profile_id=mentor.id if mentor else None,
        tier=body.tier,
        status=MentorSessionStatus.PENDING_PAYMENT,
        duration_minutes=duration,
        billed_hours=int(body.billed_hours),
        amount_cents=amount_cents,
        currency=currency,
        course_slug=(body.course_slug or "").strip() or None,
        preferred_time_note=(body.preferred_time_note or "").strip() or None,
    )
    db.add(booking)
    db.flush()

    payment_ref = _new_payment_reference(db)
    payment = Payment(
        user_id=user.id,
        course_id=None,
        enrollment_id=None,
        mentor_session_id=booking.id,
        amount_cents=amount_cents,
        currency=currency,
        status=PaymentStatus.PENDING,
        payment_reference=payment_ref,
        payment_method="bank_transfer",
    )
    db.add(payment)
    db.flush()
    _audit(db, payment.id, user.id, "mentor_session_started", f"tier={body.tier.value};booking={booking.id}")

    remita: RemitaCheckout | None = None
    instructions: BankTransferInstructions | None = None
    if remita_service.remita_configured():
        remita = _ensure_remita_for_session(db, payment, user, f"Multivate 1:1: {title}")
        message = "Continue to secure payment to confirm your 1:1 session."
    else:
        instructions = _instructions_for_session(payment, student_code=student_code, title=title, slug=slug)
        message = "Transfer the exact amount and include your payment reference. We’ll match you with a German speaker after payment."

    db.commit()
    db.refresh(booking)
    db.refresh(payment)

    return MentorSessionStartOut(
        booking=_booking_out(db, booking),
        student_code=student_code,
        payment=_payment_out(db, payment, None, user),
        instructions=instructions,
        remita=remita,
        message=message,
    )


def list_my_sessions(db: Session, user: User) -> list[MentorSessionBookingOut]:
    rows = db.execute(
        select(MentorSessionBooking)
        .where(MentorSessionBooking.student_id == user.id)
        .order_by(MentorSessionBooking.created_at.desc())
    ).scalars().all()
    return [_booking_out(db, r) for r in rows]


def mark_booking_paid(db: Session, payment: Payment) -> None:
    if not payment.mentor_session_id:
        return
    booking = db.get(MentorSessionBooking, payment.mentor_session_id)
    if not booking:
        return
    if booking.status in (MentorSessionStatus.CANCELLED, MentorSessionStatus.COMPLETED):
        return
    booking.status = MentorSessionStatus.PAID
    db.add(booking)


def mark_booking_cancelled(db: Session, payment: Payment) -> None:
    if not payment.mentor_session_id:
        return
    booking = db.get(MentorSessionBooking, payment.mentor_session_id)
    if not booking:
        return
    if booking.status == MentorSessionStatus.PENDING_PAYMENT:
        booking.status = MentorSessionStatus.CANCELLED
        db.add(booking)
