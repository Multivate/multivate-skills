"""Checkout never trusts a client-sent amount. Server prices the course."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.course import Course
from app.models.course_status import CourseStatus
from tests.registration_utils import register_instructor_complete, register_student_complete

PROFILE = {
    "education_level": "bachelors",
    "current_skills": "x",
    "skills_to_learn": "y",
    "learning_goals": "z",
    "preferred_formats": "video",
    "weekly_hours": "5-10",
    "career_direction": "up",
}

TEACH = {
    "expertise_areas": "Cloud Computing, Data Science",
    "years_experience": "3to5",
    "teaching_formats": "Live online classes, Self-paced video courses",
}


def _student(client, email: str) -> dict:
    body = {
        "name": "Learner",
        "email": email,
        "password": "password123",
        "learning_profile": PROFILE,
    }
    return register_student_complete(client, body)


def _instructor(client, email: str) -> dict:
    body = {
        "name": "Teacher",
        "email": email,
        "password": "password123",
        "teaching_profile": TEACH,
    }
    return register_instructor_complete(client, body)


def _create_course(
    client,
    token: str,
    slug: str,
    *,
    price_cents: int = 990000,
    is_free: bool = False,
    discount_percent: int = 0,
) -> None:
    cr = client.post(
        "/api/v1/courses",
        json={
            "slug": slug,
            "title": "Paid course",
            "description": "d" * 20,
            "image_url": "https://example.com/x.png",
            "lessons_count": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cr.status_code == 201, cr.text
    db = SessionLocal()
    try:
        course = db.execute(select(Course).where(Course.slug == slug)).scalar_one()
        course.status = CourseStatus.PUBLISHED
        course.price_cents = price_cents
        course.is_free = is_free
        course.discount_percent = discount_percent
        course.discount_expires_at = (
            datetime.now(timezone.utc) + timedelta(days=2) if discount_percent > 0 else None
        )
        db.commit()
    finally:
        db.close()


def test_checkout_forbidden_for_instructor(client) -> None:
    ins = _instructor(client, "ins-pay-checkout@example.com")
    tok = ins["access_token"]
    slug = "pay-checkout-ins"
    _create_course(client, tok, slug)

    r = client.post(
        "/api/v1/payments/checkout",
        json={"course_slug": slug, "amount_cents": 100, "currency": "USD"},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 403, r.text


def test_checkout_ignores_client_amount(client) -> None:
    ins = _instructor(client, "ins-pay-own@example.com")
    st = _student(client, "stu-pay-checkout@example.com")
    slug = "pay-checkout-stu"
    _create_course(client, ins["access_token"], slug)

    r = client.post(
        "/api/v1/payments/checkout",
        json={"course_slug": slug, "amount_cents": 1, "currency": "USD"},
        headers={"Authorization": f"Bearer {st['access_token']}"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["enrollment_status"] == "pending_payment"
    assert body["payment"]["amount_cents"] == 990000
    assert body["payment"]["status"] in ("pending", "awaiting_review")
    assert body["payment"]["amount_cents"] != 1


def test_hundred_percent_discount_enrolls_without_paying(client) -> None:
    ins = _instructor(client, "ins-pay-free@example.com")
    st = _student(client, "stu-pay-free@example.com")
    slug = "pay-checkout-100off"
    _create_course(client, ins["access_token"], slug, discount_percent=100)

    r = client.post(
        "/api/v1/payments/checkout",
        json={"course_slug": slug, "amount_cents": 990000, "currency": "NGN"},
        headers={"Authorization": f"Bearer {st['access_token']}"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["enrollment_status"] == "enrolled"
    assert body["payment"] is None or body["payment"]["amount_cents"] == 0


def test_create_payment_rejects_client_priced_invoice(client) -> None:
    st = _student(client, "stu-pay-mint@example.com")
    r = client.post(
        "/api/v1/payments",
        json={"course_slug": "anything", "amount_cents": 1, "currency": "NGN"},
        headers={"Authorization": f"Bearer {st['access_token']}"},
    )
    assert r.status_code == 410, r.text
