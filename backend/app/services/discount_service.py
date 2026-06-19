"""Discount codes for course checkout."""

from __future__ import annotations

import logging
import re
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.discount_code import DiscountCode, DiscountType
from app.models.discount_redemption import DiscountRedemption
from app.models.payment import Payment
from app.models.user import User
from app.schemas.discount import DiscountCodeCreateIn, DiscountCodeOut, DiscountValidateOut

_logger = logging.getLogger(__name__)

_CODE_RE = re.compile(r"^[A-Z0-9][A-Z0-9_-]{2,31}$")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_code(raw: str) -> str:
    code = raw.strip().upper().replace(" ", "-")
    if not _CODE_RE.match(code):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Code must be 3–32 letters, numbers, hyphens, or underscores.",
        )
    return code


def generate_code() -> str:
    return f"SAVE-{secrets.token_hex(3).upper()}"


def apply_discount_amount(discount: DiscountCode, original_cents: int) -> tuple[int, int]:
    if original_cents <= 0:
        return 0, 0
    if discount.discount_type == DiscountType.PERCENT:
        discount_cents = min(original_cents, (original_cents * discount.discount_value) // 100)
    else:
        discount_cents = min(original_cents, discount.discount_value)
    final_cents = max(0, original_cents - discount_cents)
    return final_cents, discount_cents


def _user_redemption_count(db: Session, discount_id: UUID, user_id: UUID) -> int:
    return int(
        db.execute(
            select(func.count())
            .select_from(DiscountRedemption)
            .where(
                DiscountRedemption.discount_code_id == discount_id,
                DiscountRedemption.user_id == user_id,
            )
        ).scalar_one()
    )


def get_discount_for_checkout(
    db: Session,
    raw_code: str,
    user: User,
    course: Course,
) -> DiscountCode:
    code = normalize_code(raw_code)
    discount = db.execute(select(DiscountCode).where(DiscountCode.code == code)).scalar_one_or_none()
    if not discount:
        _logger.info("Discount lookup miss code=%s user_id=%s", code, user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="That code is not valid.")
    if not discount.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code is no longer active.")
    now = _utcnow()
    if discount.starts_at and now < discount.starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code is not active yet.")
    if discount.expires_at and now > discount.expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code has expired.")
    if discount.course_id and discount.course_id != course.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code does not apply to this course.")
    if discount.max_uses is not None and discount.used_count >= discount.max_uses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code has reached its usage limit.")
    user_uses = _user_redemption_count(db, discount.id, user.id)
    if user_uses >= discount.max_uses_per_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already used this code.")
    _logger.info(
        "Discount validated code=%s user_id=%s course=%s type=%s value=%s",
        code,
        user.id,
        course.slug,
        discount.discount_type,
        discount.discount_value,
    )
    return discount


def validate_for_course(
    db: Session,
    raw_code: str,
    user: User,
    course: Course,
    *,
    original_cents: int,
    currency: str,
) -> DiscountValidateOut:
    discount = get_discount_for_checkout(db, raw_code, user, course)
    final_cents, discount_cents = apply_discount_amount(discount, original_cents)
    return DiscountValidateOut(
        valid=True,
        code=discount.code,
        discount_type=discount.discount_type,
        discount_value=discount.discount_value,
        original_amount_cents=original_cents,
        discount_cents=discount_cents,
        final_amount_cents=final_cents,
        currency=currency,
        message="Code applied.",
    )


def record_redemption(db: Session, payment: Payment) -> None:
    if not payment.discount_code_id:
        return
    existing = db.execute(
        select(DiscountRedemption.id).where(DiscountRedemption.payment_id == payment.id)
    ).scalar_one_or_none()
    if existing:
        return
    discount = db.get(DiscountCode, payment.discount_code_id)
    if not discount:
        return
    db.add(
        DiscountRedemption(
            discount_code_id=discount.id,
            user_id=payment.user_id,
            payment_id=payment.id,
        )
    )
    discount.used_count += 1
    db.add(discount)
    _logger.info(
        "Discount redeemed code=%s payment_id=%s used_count=%s",
        discount.code,
        payment.id,
        discount.used_count,
    )


def _discount_out(db: Session, row: DiscountCode) -> DiscountCodeOut:
    course_title = None
    if row.course_id:
        course = db.get(Course, row.course_id)
        course_title = course.title if course else None
    return DiscountCodeOut(
        id=row.id,
        code=row.code,
        label=row.label,
        discount_type=row.discount_type,
        discount_value=row.discount_value,
        course_id=row.course_id,
        course_title=course_title,
        max_uses=row.max_uses,
        used_count=row.used_count,
        max_uses_per_user=row.max_uses_per_user,
        starts_at=row.starts_at,
        expires_at=row.expires_at,
        is_active=row.is_active,
        created_at=row.created_at,
    )


def list_discount_codes(db: Session, *, limit: int = 100) -> list[DiscountCodeOut]:
    rows = db.execute(select(DiscountCode).order_by(DiscountCode.created_at.desc()).limit(limit)).scalars().all()
    return [_discount_out(db, row) for row in rows]


def create_discount_code(db: Session, admin: User, payload: DiscountCodeCreateIn) -> DiscountCodeOut:
    code = normalize_code(payload.code) if payload.code else generate_code()
    for _ in range(8):
        clash = db.execute(select(DiscountCode.id).where(DiscountCode.code == code)).scalar_one_or_none()
        if not clash:
            break
        code = generate_code()
    else:
        raise HTTPException(status_code=500, detail="Could not generate a unique code.")

    if payload.course_id:
        course = db.get(Course, payload.course_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    row = DiscountCode(
        code=code,
        label=payload.label.strip() if payload.label else None,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        course_id=payload.course_id,
        max_uses=payload.max_uses,
        max_uses_per_user=payload.max_uses_per_user,
        starts_at=payload.starts_at,
        expires_at=payload.expires_at,
        is_active=payload.is_active,
        created_by_id=admin.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _logger.info("Discount code created code=%s admin_id=%s", code, admin.id)
    return _discount_out(db, row)


def set_discount_active(db: Session, discount_id: UUID, *, is_active: bool) -> DiscountCodeOut:
    row = db.get(DiscountCode, discount_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount code not found")
    row.is_active = is_active
    db.add(row)
    db.commit()
    db.refresh(row)
    _logger.info("Discount code active=%s code=%s", is_active, row.code)
    return _discount_out(db, row)
