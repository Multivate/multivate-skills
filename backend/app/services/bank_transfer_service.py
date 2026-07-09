from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limit import enforce_rate_limit
from app.models.course import Course
from app.models.discount_code import DiscountCode
from app.models.enrollment import Enrollment
from app.models.enrollment_status import EnrollmentStatus
from app.models.payment import Payment, PaymentStatus
from app.models.payment_audit_log import PaymentAuditLog
from app.models.role import UserRole
from app.models.user import User
from app.schemas.bank_transfer import (
    BankTransferInstructions,
    EnrollmentStartOut,
    PaymentStatusOut,
    PaymentVerifyIn,
    PaymentVerifyOut,
    RemitaCheckout,
    StudentPaymentOut,
)
from app.services import course_service, discount_service, mail_service, notification_service, remita_service

_logger = logging.getLogger(__name__)

_VERIFY_MAX_PER_MINUTE = 8


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _audit(db: Session, payment_id: UUID, actor_id: UUID | None, action: str, detail: str | None = None) -> None:
    db.add(PaymentAuditLog(payment_id=payment_id, actor_user_id=actor_id, action=action, detail=detail))
    _logger.info("payment_audit payment_id=%s action=%s actor=%s", payment_id, action, actor_id)


def _rate_limit_verify(user_id: UUID) -> None:
    enforce_rate_limit(
        f"payment-verify:user:{user_id}",
        limit=_VERIFY_MAX_PER_MINUTE,
        window_sec=60,
        detail="Too many verification attempts",
    )


def ensure_student_code(db: Session, user: User) -> str:
    if user.student_code:
        return user.student_code
    year = _utcnow().year
    seq = db.execute(
        select(func.count()).select_from(User).where(User.student_code.isnot(None))
    ).scalar_one()
    code = f"STU-{year}-{int(seq) + 1:04d}"
    user.student_code = code
    db.add(user)
    db.flush()
    _logger.info("Assigned student_code=%s user_id=%s", code, user.id)
    return code


def _new_payment_reference(db: Session) -> str:
    for _ in range(12):
        ref = f"PAY-{secrets.token_hex(4).upper()}"
        exists = db.execute(select(Payment.id).where(Payment.payment_reference == ref)).scalar_one_or_none()
        if not exists:
            return ref
    raise HTTPException(status_code=500, detail="Could not generate payment reference")


def _course_price(course: Course) -> tuple[int, str]:
    if course.is_free or course.price_cents <= 0:
        return 0, get_settings().bank_transfer_currency.upper()
    return course.price_cents, get_settings().bank_transfer_currency.upper()


def _instructions_for(payment: Payment, course: Course, student_code: str) -> BankTransferInstructions:
    s = get_settings()
    return BankTransferInstructions(
        bank_name=s.bank_name,
        account_name=s.bank_account_name,
        account_number=s.bank_account_number,
        amount_cents=payment.amount_cents,
        currency=payment.currency.upper(),
        payment_reference=payment.payment_reference or "",
        student_code=student_code,
        course_title=course.title,
        course_slug=course.slug,
        original_amount_cents=payment.original_amount_cents,
        discount_cents=payment.discount_cents or 0,
        coupon_code=payment.coupon_code,
    )


def _remita_checkout_for(payment: Payment) -> RemitaCheckout:
    rrr = payment.transaction_reference or ""
    if not rrr:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment is not ready yet. Please try again.")
    checkout = remita_service.build_checkout(rrr=rrr, payment_reference=payment.payment_reference or "")
    return RemitaCheckout(
        rrr=checkout["rrr"],
        merchant_id=checkout["merchant_id"],
        payment_hash=checkout["payment_hash"],
        payment_gateway_url=checkout["payment_gateway_url"],
        response_url=checkout["response_url"],
        amount_cents=payment.amount_cents,
        currency=payment.currency.upper(),
        payment_reference=payment.payment_reference or "",
    )


def _ensure_remita_rrr(db: Session, payment: Payment, course: Course, user: User) -> RemitaCheckout:
    if payment.transaction_reference and payment.payment_method == "remita":
        return _remita_checkout_for(payment)

    _logger.info(
        "Creating Remita RRR payment_ref=%s course=%s user_id=%s amount_cents=%s",
        payment.payment_reference,
        course.slug,
        user.id,
        payment.amount_cents,
    )
    try:
        rrr_payload = remita_service.generate_rrr(
            order_id=payment.payment_reference or str(payment.id),
            amount_cents=payment.amount_cents,
            payer_name=user.name,
            payer_email=user.email,
            payer_phone=remita_service.normalize_phone(None),
            description=f"Multivate course: {course.title}",
        )
    except Exception as exc:
        _logger.exception("Remita RRR generation failed payment_ref=%s", payment.payment_reference)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't start online payment right now. Please try again shortly.",
        ) from exc

    rrr = str(rrr_payload.get("RRR") or rrr_payload.get("rrr") or "").strip()
    payment.payment_method = "remita"
    payment.transaction_reference = rrr
    payment.external_ref = payment.payment_reference
    payment.verification_response = json.dumps({"rrr_init": rrr_payload})
    db.add(payment)
    db.flush()
    _audit(db, payment.id, user.id, "remita_rrr_created", f"rrr={rrr}")
    return _remita_checkout_for(payment)


def _enrollment_start_message(*, remita: bool, awaiting_review: bool) -> str:
    if awaiting_review:
        return "We received your payment details and are reviewing them."
    if remita:
        return "Continue to secure payment to finish enrollment."
    return "Transfer the exact amount and include your payment reference."


def _payment_status_bundle(
    db: Session,
    payment: Payment,
    course: Course | None,
    owner: User,
) -> tuple[BankTransferInstructions | None, RemitaCheckout | None]:
    instructions = None
    remita = None
    if payment.status != PaymentStatus.PENDING or not course:
        return instructions, remita
    if payment.payment_method == "remita" and remita_service.remita_configured():
        remita = _ensure_remita_rrr(db, payment, course, owner)
    elif not remita_service.remita_configured():
        instructions = _instructions_for(payment, course, owner.student_code or "")
    return instructions, remita


def _payment_out(
    db: Session,
    payment: Payment,
    course: Course | None,
    user: User,
    *,
    include_user: bool = False,
) -> StudentPaymentOut:
    return StudentPaymentOut(
        id=payment.id,
        user_id=payment.user_id,
        user_name=user.name if include_user else None,
        user_email=str(user.email) if include_user else None,
        course_id=payment.course_id,
        course_slug=course.slug if course else None,
        course_title=course.title if course else None,
        student_code=user.student_code,
        payment_reference=payment.payment_reference,
        transaction_reference=payment.transaction_reference,
        amount_cents=payment.amount_cents,
        currency=payment.currency,
        status=payment.status,
        payment_method=payment.payment_method,
        coupon_code=payment.coupon_code,
        original_amount_cents=payment.original_amount_cents,
        discount_cents=payment.discount_cents or 0,
        paid_at=payment.paid_at,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )


def _apply_coupon_pricing(
    db: Session,
    user: User,
    course: Course,
    coupon_code: str | None,
) -> tuple[int, str, int, int, DiscountCode | None, str | None]:
    """Returns amount_cents, currency, original_cents, discount_cents, discount_row, normalized_code."""
    amount_cents, currency = _course_price(course)
    original_cents = amount_cents
    discount_cents = 0
    discount_row = None
    normalized_code: str | None = None
    if coupon_code and amount_cents > 0:
        discount_row = discount_service.get_discount_for_checkout(db, coupon_code, user, course)
        amount_cents, discount_cents = discount_service.apply_discount_amount(discount_row, original_cents)
        normalized_code = discount_row.code
        _logger.info(
            "Coupon applied code=%s course=%s original=%s discount=%s final=%s",
            normalized_code,
            course.slug,
            original_cents,
            discount_cents,
            amount_cents,
        )
    return amount_cents, currency, original_cents, discount_cents, discount_row, normalized_code


def _attach_discount_to_payment(
    payment: Payment,
    *,
    original_cents: int,
    discount_cents: int,
    discount_row: DiscountCode | None,
    normalized_code: str | None,
) -> None:
    payment.original_amount_cents = original_cents if discount_cents > 0 else None
    payment.discount_cents = discount_cents
    payment.coupon_code = normalized_code
    payment.discount_code_id = discount_row.id if discount_row else None


def start_enrollment(db: Session, user: User, course_slug: str, coupon_code: str | None = None) -> EnrollmentStartOut:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can enroll in courses")

    course = course_service.get_course_or_404(db, course_slug)
    amount_cents, currency, original_cents, discount_cents, discount_row, normalized_code = _apply_coupon_pricing(
        db, user, course, coupon_code
    )

    if course.is_free or (amount_cents == 0 and original_cents == 0):
        existing = db.execute(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
        ).scalar_one_or_none()
        if existing and existing.status == EnrollmentStatus.ENROLLED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled in this course")
        student_code = ensure_student_code(db, user)
        if existing:
            existing.status = EnrollmentStatus.ENROLLED
            db.add(existing)
        else:
            db.add(
                Enrollment(
                    user_id=user.id,
                    course_id=course.id,
                    status=EnrollmentStatus.ENROLLED,
                    lesson_done=0,
                    progress_pct=0,
                )
            )
        db.commit()
        return EnrollmentStartOut(
            enrollment_status=EnrollmentStatus.ENROLLED,
            student_code=student_code,
            payment=None,
            instructions=None,
            message="Enrolled successfully (free course).",
        )

    if amount_cents == 0 and original_cents > 0:
        student_code = ensure_student_code(db, user)
        existing = db.execute(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
        ).scalar_one_or_none()
        if existing and existing.status == EnrollmentStatus.ENROLLED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled in this course")
        if existing:
            existing.status = EnrollmentStatus.ENROLLED
            db.add(existing)
            enrollment = existing
        else:
            enrollment = Enrollment(
                user_id=user.id,
                course_id=course.id,
                status=EnrollmentStatus.ENROLLED,
                lesson_done=0,
                progress_pct=0,
            )
            db.add(enrollment)
            db.flush()
        payment_ref = _new_payment_reference(db)
        payment = Payment(
            user_id=user.id,
            course_id=course.id,
            enrollment_id=enrollment.id,
            amount_cents=0,
            currency=currency,
            status=PaymentStatus.PAID,
            payment_reference=payment_ref,
            payment_method="bank_transfer",
            external_ref="discount_full",
            paid_at=_utcnow(),
        )
        _attach_discount_to_payment(
            payment,
            original_cents=original_cents,
            discount_cents=discount_cents,
            discount_row=discount_row,
            normalized_code=normalized_code,
        )
        db.add(payment)
        db.flush()
        discount_service.record_redemption(db, payment)
        _audit(db, payment.id, user.id, "payment_discount_full", f"ref={payment_ref} code={normalized_code}")
        db.commit()
        return EnrollmentStartOut(
            enrollment_status=EnrollmentStatus.ENROLLED,
            student_code=student_code,
            payment=_payment_out(db, payment, course, user),
            instructions=None,
            message="Your discount covers the full price. You are enrolled.",
        )

    student_code = ensure_student_code(db, user)

    existing_enr = db.execute(
        select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
    ).scalar_one_or_none()

    if existing_enr and existing_enr.status == EnrollmentStatus.ENROLLED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled in this course")

    pending_payment = db.execute(
        select(Payment)
        .where(
            Payment.user_id == user.id,
            Payment.course_id == course.id,
            Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.AWAITING_REVIEW]),
        )
        .order_by(Payment.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    if pending_payment and pending_payment.payment_reference:
        amount_changed = pending_payment.amount_cents != amount_cents
        pending_payment.amount_cents = amount_cents
        pending_payment.currency = currency
        _attach_discount_to_payment(
            pending_payment,
            original_cents=original_cents,
            discount_cents=discount_cents,
            discount_row=discount_row,
            normalized_code=normalized_code,
        )
        if amount_changed and pending_payment.payment_method == "remita":
            pending_payment.transaction_reference = None
        if not existing_enr:
            existing_enr = Enrollment(
                user_id=user.id,
                course_id=course.id,
                status=EnrollmentStatus.PENDING_PAYMENT,
                lesson_done=0,
                progress_pct=0,
            )
            db.add(existing_enr)
            db.flush()
            pending_payment.enrollment_id = existing_enr.id
            db.add(pending_payment)
        db.commit()
        db.refresh(pending_payment)
        waiting = pending_payment.status == PaymentStatus.AWAITING_REVIEW
        remita_checkout = None
        instructions = None
        if not waiting:
            if remita_service.remita_configured():
                remita_checkout = _ensure_remita_rrr(db, pending_payment, course, user)
                db.commit()
            else:
                instructions = _instructions_for(pending_payment, course, student_code)
        return EnrollmentStartOut(
            enrollment_status=EnrollmentStatus.PENDING_PAYMENT,
            student_code=student_code,
            payment=_payment_out(db, pending_payment, course, user),
            instructions=instructions,
            remita=remita_checkout,
            message=_enrollment_start_message(remita=remita_checkout is not None, awaiting_review=waiting),
        )

    enrollment = existing_enr
    if enrollment is None:
        enrollment = Enrollment(
            user_id=user.id,
            course_id=course.id,
            status=EnrollmentStatus.PENDING_PAYMENT,
            lesson_done=0,
            progress_pct=0,
        )
        db.add(enrollment)
        db.flush()
    else:
        enrollment.status = EnrollmentStatus.PENDING_PAYMENT
        db.add(enrollment)
        db.flush()

    payment_ref = _new_payment_reference(db)
    use_remita = remita_service.remita_configured()
    payment = Payment(
        user_id=user.id,
        course_id=course.id,
        enrollment_id=enrollment.id,
        amount_cents=amount_cents,
        currency=currency,
        status=PaymentStatus.PENDING,
        payment_reference=payment_ref,
        payment_method="remita" if use_remita else "bank_transfer",
        external_ref="remita_v1" if use_remita else "bank_transfer_v1",
    )
    _attach_discount_to_payment(
        payment,
        original_cents=original_cents,
        discount_cents=discount_cents,
        discount_row=discount_row,
        normalized_code=normalized_code,
    )
    db.add(payment)
    db.flush()
    _audit(db, payment.id, user.id, "payment_created", f"ref={payment_ref} course={course.slug}")
    db.commit()
    db.refresh(payment)
    db.refresh(enrollment)

    remita_checkout = None
    instructions = None
    if use_remita:
        remita_checkout = _ensure_remita_rrr(db, payment, course, user)
        db.commit()
        db.refresh(payment)
    else:
        instructions = _instructions_for(payment, course, student_code)

    return EnrollmentStartOut(
        enrollment_status=EnrollmentStatus.PENDING_PAYMENT,
        student_code=student_code,
        payment=_payment_out(db, payment, course, user),
        instructions=instructions,
        remita=remita_checkout,
        message=_enrollment_start_message(remita=remita_checkout is not None, awaiting_review=False),
    )


def get_payment_status(db: Session, user: User, payment_reference: str) -> PaymentStatusOut:
    payment = _payment_by_reference(db, payment_reference)
    if payment.user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your payment")
    course = db.get(Course, payment.course_id) if payment.course_id else None
    owner = db.get(User, payment.user_id)
    instructions, remita = _payment_status_bundle(db, payment, course, owner or user)
    return PaymentStatusOut(
        payment=_payment_out(db, payment, course, owner or user),
        instructions=instructions,
        remita=remita,
    )


def _payment_by_reference(db: Session, payment_reference: str) -> Payment:
    ref = payment_reference.strip().upper()
    payment = db.execute(select(Payment).where(Payment.payment_reference == ref)).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment reference not found")
    return payment


def _complete_payment(
    db: Session,
    payment: Payment,
    actor: User | None,
    transaction_reference: str,
    verification_payload: dict,
    *,
    skip_amount_check: bool = False,
) -> PaymentVerifyOut:
    if payment.status in (PaymentStatus.PAID, PaymentStatus.COMPLETED):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already verified")
    if payment.status == PaymentStatus.FAILED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment was rejected")
    if payment.status not in (PaymentStatus.PENDING, PaymentStatus.AWAITING_REVIEW):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment cannot be approved in this state")

    dup = db.execute(
        select(Payment.id).where(
            Payment.transaction_reference == transaction_reference,
            Payment.id != payment.id,
            Payment.status.in_(
                [PaymentStatus.PAID, PaymentStatus.COMPLETED, PaymentStatus.AWAITING_REVIEW],
            ),
        )
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transaction reference already used")

    course = db.get(Course, payment.course_id) if payment.course_id else None
    if course and not skip_amount_check:
        if payment.original_amount_cents is not None:
            if payment.currency.upper() != get_settings().bank_transfer_currency.upper():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount mismatch")
        else:
            expected_amount, expected_currency = _course_price(course)
            if payment.amount_cents != expected_amount or payment.currency.upper() != expected_currency.upper():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount mismatch")

    now = _utcnow()
    payment.status = PaymentStatus.PAID
    payment.transaction_reference = transaction_reference
    payment.paid_at = now
    payment.verification_response = json.dumps(verification_payload)
    db.add(payment)

    enrollment = None
    if payment.enrollment_id:
        enrollment = db.get(Enrollment, payment.enrollment_id)
    if enrollment is None and payment.course_id:
        enrollment = db.execute(
            select(Enrollment).where(
                Enrollment.user_id == payment.user_id,
                Enrollment.course_id == payment.course_id,
            )
        ).scalar_one_or_none()

    if enrollment:
        enrollment.status = EnrollmentStatus.ENROLLED
        db.add(enrollment)

    _audit(
        db,
        payment.id,
        actor.id if actor else None,
        "payment_verified",
        f"txn={transaction_reference}",
    )
    discount_service.record_redemption(db, payment)
    db.commit()
    db.refresh(payment)

    student = db.get(User, payment.user_id)
    if student and course:
        try:
            _send_enrollment_confirmed_email(student, course)
            notification_service.create_notification(
                db,
                user_id=student.id,
                kind="payment_approved",
                title="You are enrolled",
                body=f"Your payment for {course.title} was confirmed. You can start learning now.",
                link_href="/dashboard/courses",
            )
        except Exception:
            _logger.exception(
                "Post-approval notifications failed payment_id=%s user_id=%s",
                payment.id,
                student.id,
            )

    if not student:
        raise HTTPException(status_code=500, detail="Payment owner missing")
    return PaymentVerifyOut(
        success=True,
        payment=_payment_out(db, payment, course, student),
        message="Payment verified. You now have access to the course.",
    )


def verify_payment(db: Session, user: User, payload: PaymentVerifyIn) -> PaymentVerifyOut:
    """Student confirms they sent money — admin must approve before enrollment."""
    _rate_limit_verify(user.id)
    payment = _payment_by_reference(db, payload.payment_reference)
    if payment.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your payment")
    if payment.status == PaymentStatus.AWAITING_REVIEW:
        student = db.get(User, payment.user_id)
        course = db.get(Course, payment.course_id) if payment.course_id else None
        if not student:
            raise HTTPException(status_code=500, detail="Payment owner missing")
        return PaymentVerifyOut(
            success=True,
            payment=_payment_out(db, payment, course, student),
            message="We already have your payment details and are reviewing them.",
        )
    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This payment cannot be updated")

    txn = payload.transaction_reference.strip()
    if len(txn) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid transaction reference")

    dup = db.execute(
        select(Payment.id).where(
            Payment.transaction_reference == txn,
            Payment.id != payment.id,
            Payment.status.in_([PaymentStatus.PAID, PaymentStatus.COMPLETED, PaymentStatus.AWAITING_REVIEW]),
        )
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transaction reference already used")

    payment.status = PaymentStatus.AWAITING_REVIEW
    payment.transaction_reference = txn
    payment.verification_response = json.dumps(
        {
            "method": "student_claim",
            "claimed_at": _utcnow().isoformat(),
            "transaction_reference": txn,
        }
    )
    db.add(payment)
    _audit(db, payment.id, user.id, "payment_claimed", f"txn={txn}")
    db.commit()
    db.refresh(payment)

    course = db.get(Course, payment.course_id) if payment.course_id else None
    student = db.get(User, payment.user_id)
    if course and student:
        try:
            notification_service.notify_admins(
                db,
                kind="payment_claim",
                title="Payment waiting for review",
                body=(
                    f"{student.name} says they paid for {course.title}. "
                    f"Reference {payment.payment_reference or '-'} · Txn {txn}"
                ),
                link_href="/dashboard/admin/payments",
            )
            notification_service.create_notification(
                db,
                user_id=student.id,
                kind="payment_submitted",
                title="Payment received",
                body="We got your payment details. We will notify you once access is granted.",
                link_href="/dashboard/payments",
            )
        except Exception:
            _logger.exception(
                "Payment notifications failed ref=%s user_id=%s",
                payment.payment_reference,
                student.id,
            )

    if not student:
        student = db.get(User, payment.user_id)
        raise HTTPException(status_code=500, detail="Payment owner missing")
    return PaymentVerifyOut(
        success=True,
        payment=_payment_out(db, payment, course, student),
        message="Thanks. We will confirm your payment and grant access soon.",
    )


def _unique_admin_transaction_reference(db: Session, payment: Payment) -> str:
    existing = (payment.transaction_reference or "").strip()
    if existing:
        clash = db.execute(
            select(Payment.id).where(
                Payment.transaction_reference == existing,
                Payment.id != payment.id,
                Payment.status.in_(
                    [PaymentStatus.PAID, PaymentStatus.COMPLETED, PaymentStatus.AWAITING_REVIEW],
                ),
            )
        ).scalar_one_or_none()
        if not clash:
            return existing
    for _ in range(12):
        txn = f"ADMIN-{secrets.token_hex(4).upper()}"
        taken = db.execute(select(Payment.id).where(Payment.transaction_reference == txn)).scalar_one_or_none()
        if not taken:
            return txn
    raise HTTPException(status_code=500, detail="Could not assign transaction reference")


def admin_approve_payment(db: Session, admin: User, payment_id: UUID, transaction_reference: str | None) -> PaymentVerifyOut:
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    txn = (transaction_reference or "").strip() or _unique_admin_transaction_reference(db, payment)
    verification_payload = {
        "method": "admin_manual",
        "verified_at": _utcnow().isoformat(),
        "transaction_reference": txn,
        "verifier_admin_id": str(admin.id),
    }
    _logger.info("Admin approving payment id=%s admin=%s txn=%s", payment_id, admin.id, txn)
    return _complete_payment(
        db,
        payment,
        admin,
        txn,
        verification_payload,
        skip_amount_check=True,
    )


def admin_reject_payment(db: Session, admin: User, payment_id: UUID, reason: str | None = None) -> PaymentVerifyOut:
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.status in (PaymentStatus.PAID, PaymentStatus.COMPLETED):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already approved")
    if payment.status == PaymentStatus.FAILED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already rejected")

    payment.status = PaymentStatus.FAILED
    payment.verification_response = json.dumps(
        {
            "method": "admin_reject",
            "rejected_at": _utcnow().isoformat(),
            "reason": (reason or "").strip() or None,
            "admin_id": str(admin.id),
        }
    )
    db.add(payment)

    enrollment = db.get(Enrollment, payment.enrollment_id) if payment.enrollment_id else None
    if enrollment is None and payment.course_id:
        enrollment = db.execute(
            select(Enrollment).where(
                Enrollment.user_id == payment.user_id,
                Enrollment.course_id == payment.course_id,
            )
        ).scalar_one_or_none()
    if enrollment and enrollment.status == EnrollmentStatus.PENDING_PAYMENT:
        enrollment.status = EnrollmentStatus.CANCELLED
        db.add(enrollment)

    _audit(db, payment.id, admin.id, "payment_rejected", reason or "rejected")
    db.commit()
    db.refresh(payment)

    student = db.get(User, payment.user_id)
    course = db.get(Course, payment.course_id) if payment.course_id else None
    if student:
        detail = (reason or "").strip() or "We could not confirm your payment."
        notification_service.create_notification(
            db,
            user_id=student.id,
            kind="payment_rejected",
            title="Payment not confirmed",
            body=f"{detail} You can try again from your payments page.",
            link_href="/dashboard/payments",
        )
    if not student:
        raise HTTPException(status_code=500, detail="Payment owner missing")
    return PaymentVerifyOut(
        success=False,
        payment=_payment_out(db, payment, course, student),
        message="Payment rejected.",
    )


def list_student_payments(db: Session, user_id: UUID) -> list[StudentPaymentOut]:
    rows = db.execute(
        select(Payment, Course)
        .outerjoin(Course, Course.id == Payment.course_id)
        .where(Payment.user_id == user_id)
        .order_by(Payment.created_at.desc())
    ).all()
    user = db.get(User, user_id)
    fallback = user or User(name="", email="", password_hash="", role=UserRole.STUDENT)
    return [_payment_out(db, payment, course, fallback) for payment, course in rows]


def list_admin_payments(
    db: Session,
    *,
    status_filter: PaymentStatus | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[StudentPaymentOut]:
    stmt = select(Payment, User, Course).join(User, User.id == Payment.user_id).outerjoin(
        Course, Course.id == Payment.course_id
    )
    if status_filter:
        stmt = stmt.where(Payment.status == status_filter)
    if search:
        q = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                User.name.ilike(q),
                User.email.ilike(q),
                User.student_code.ilike(q),
                Payment.payment_reference.ilike(q),
            )
        )
    stmt = stmt.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
    rows = db.execute(stmt).all()
    result: list[StudentPaymentOut] = []
    for payment, user, course in rows:
        result.append(_payment_out(db, payment, course, user, include_user=True))
    return result


def _send_enrollment_confirmed_email(user: User, course: Course) -> None:
    subject = "Enrollment Confirmed"
    body = (
        f"Hi {user.name.split()[0] if user.name else 'there'},\n\n"
        f"Your payment has been received successfully.\n"
        f"You now have access to {course.title}.\n\n"
        "Sign in to your dashboard to start learning.\n"
    )
    html = (
        f"<p>Hi {user.name.split()[0] if user.name else 'there'},</p>"
        f"<p>Your payment has been received successfully.</p>"
        f"<p>You now have access to <strong>{course.title}</strong>.</p>"
        f"<p>Sign in to your dashboard to start learning.</p>"
    )
    try:
        mail_service.send_plain_email(str(user.email), subject, body, html)
        _logger.info("Enrollment confirmation email sent to %s course=%s", user.email, course.slug)
    except Exception:
        _logger.exception("Failed to send enrollment confirmation to %s", user.email)


def _find_payment_for_remita(db: Session, *, rrr: str, order_ref: str) -> Payment | None:
    if rrr:
        payment = db.execute(select(Payment).where(Payment.transaction_reference == rrr)).scalar_one_or_none()
        if payment:
            return payment
    if order_ref:
        return db.execute(select(Payment).where(Payment.payment_reference == order_ref.upper())).scalar_one_or_none()
    return None


def handle_remita_callback(db: Session, raw_body: str) -> str:
    _logger.info("Remita callback received bytes=%s", len(raw_body))
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        _logger.warning("Remita callback invalid JSON")
        return "not ok"

    items = payload if isinstance(payload, list) else [payload]
    all_ok = True
    for item in items:
        if not isinstance(item, dict):
            all_ok = False
            continue
        rrr = str(item.get("rrr") or item.get("RRR") or "").strip()
        order_ref = str(item.get("orderRef") or item.get("orderId") or "").strip()
        payment = _find_payment_for_remita(db, rrr=rrr, order_ref=order_ref)
        if not payment:
            _logger.warning("Remita callback payment not found rrr=%s order_ref=%s", rrr, order_ref)
            all_ok = False
            continue
        if payment.status in (PaymentStatus.PAID, PaymentStatus.COMPLETED):
            _logger.info("Remita callback payment already paid ref=%s", payment.payment_reference)
            continue
        check_rrr = rrr or payment.transaction_reference or ""
        if not check_rrr:
            all_ok = False
            continue
        try:
            status_payload = remita_service.check_rrr_status(check_rrr)
        except Exception:
            _logger.exception("Remita callback status check failed rrr=%s", check_rrr)
            all_ok = False
            continue
        if not remita_service.remita_status_is_paid(status_payload):
            _logger.info(
                "Remita callback not paid yet ref=%s status=%s",
                payment.payment_reference,
                status_payload.get("status"),
            )
            all_ok = False
            continue
        try:
            _complete_payment(
                db,
                payment,
                None,
                check_rrr,
                {"remita_callback": item, "remita_status": status_payload},
            )
            _logger.info("Remita callback completed payment ref=%s rrr=%s", payment.payment_reference, check_rrr)
        except HTTPException as exc:
            if exc.status_code == status.HTTP_409_CONFLICT:
                _logger.info("Remita callback duplicate completion ref=%s", payment.payment_reference)
            else:
                _logger.warning("Remita callback completion failed ref=%s detail=%s", payment.payment_reference, exc.detail)
                all_ok = False
        except Exception:
            _logger.exception("Remita callback completion error ref=%s", payment.payment_reference)
            all_ok = False
    return "OK" if all_ok else "not ok"


def refresh_remita_payment(db: Session, user: User, payment_reference: str) -> PaymentVerifyOut:
    _rate_limit_verify(user.id)
    payment = _payment_by_reference(db, payment_reference)
    if payment.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your payment")
    if payment.status in (PaymentStatus.PAID, PaymentStatus.COMPLETED):
        course = db.get(Course, payment.course_id) if payment.course_id else None
        student = db.get(User, payment.user_id)
        if not student:
            raise HTTPException(status_code=500, detail="Payment owner missing")
        return PaymentVerifyOut(
            success=True,
            payment=_payment_out(db, payment, course, student),
            message="Payment confirmed. You now have access to the course.",
        )
    if payment.payment_method != "remita" or not payment.transaction_reference:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This payment is not an online checkout.")
    try:
        status_payload = remita_service.check_rrr_status(payment.transaction_reference)
    except Exception as exc:
        _logger.exception("Remita refresh failed ref=%s", payment.payment_reference)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't check payment status right now. Please try again shortly.",
        ) from exc
    if remita_service.remita_status_is_paid(status_payload):
        return _complete_payment(
            db,
            payment,
            user,
            payment.transaction_reference,
            {"remita_refresh": status_payload},
        )
    course = db.get(Course, payment.course_id) if payment.course_id else None
    student = db.get(User, payment.user_id)
    if not student:
        raise HTTPException(status_code=500, detail="Payment owner missing")
    return PaymentVerifyOut(
        success=False,
        payment=_payment_out(db, payment, course, student),
        message="Payment not confirmed yet. If you already paid, wait a moment and check again.",
    )
