from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models.course import Course

DISCOUNT_PRESETS = (0, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def sale_is_live(percent: int, expires_at: datetime | None, *, now: datetime | None = None) -> bool:
    if percent <= 0 or expires_at is None:
        return False
    current = now or datetime.now(timezone.utc)
    exp = _aware(expires_at)
    if exp is None:
        return False
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return exp > current


def list_price_cents(course: Course) -> int:
    if course.is_free or course.price_cents <= 0:
        return 0
    return int(course.price_cents)


def payable_cents(course: Course, *, now: datetime | None = None) -> int:
    listed = list_price_cents(course)
    percent = int(getattr(course, "discount_percent", 0) or 0)
    expires = getattr(course, "discount_expires_at", None)
    if listed <= 0 or not sale_is_live(percent, expires, now=now):
        return listed
    return max(0, int(round(listed * (100 - percent) / 100)))


def sale_price_cents(course: Course, *, now: datetime | None = None) -> int | None:
    listed = list_price_cents(course)
    payable = payable_cents(course, now=now)
    if listed <= 0 or payable >= listed:
        return None
    return payable


def normalize_discount(
    *,
    is_free: bool,
    percent: int,
    expires_at: datetime | None,
) -> tuple[int, datetime | None]:
    if is_free:
        return 0, None
    value = int(percent or 0)
    if value < 0 or value > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Discount must be a whole number from 0 to 100.",
        )
    if value <= 0:
        return 0, None
    exp = _aware(expires_at)
    if exp is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Set when the discount ends.",
        )
    return value, exp
