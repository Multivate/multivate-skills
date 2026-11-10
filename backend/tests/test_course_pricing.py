from datetime import datetime, timedelta, timezone

from app.models.course import Course
from app.services.course_pricing import normalize_discount, payable_cents
from app.services.remita_service import remita_paid_amount_cents


def _course(*, price_cents: int, percent: int = 0, days: int = 2) -> Course:
    row = Course()
    row.is_free = False
    row.price_cents = price_cents
    row.discount_percent = percent
    row.discount_expires_at = (
        datetime.now(timezone.utc) + timedelta(days=days) if percent > 0 else None
    )
    return row


def test_typed_percent_and_full_off() -> None:
    listed = 990000
    assert payable_cents(_course(price_cents=listed, percent=35)) == 643500
    assert payable_cents(_course(price_cents=listed, percent=100)) == 0
    assert payable_cents(_course(price_cents=listed, percent=0)) == listed


def test_normalize_discount_allows_100() -> None:
    expires = datetime.now(timezone.utc) + timedelta(days=1)
    percent, exp = normalize_discount(is_free=False, percent=100, expires_at=expires)
    assert percent == 100
    assert exp is not None


def test_remita_amount_naira_to_kobo() -> None:
    assert remita_paid_amount_cents({"amount": "9900"}) == 990000
    assert remita_paid_amount_cents({"Amount": "9,900.00"}) == 990000
    assert remita_paid_amount_cents({"amountPaid": 15000}) == 1500000
    assert remita_paid_amount_cents({}) is None
