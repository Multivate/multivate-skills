"""Checkout records payment and enrollment for students only."""

from __future__ import annotations

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


def test_checkout_forbidden_for_instructor(client) -> None:
    ins = _instructor(client, "ins-pay-checkout@example.com")
    tok = ins["access_token"]
    slug = "pay-checkout-ins"
    cr = client.post(
        "/api/v1/courses",
        json={
            "slug": slug,
            "title": "Ins course pay",
            "description": "d" * 20,
            "image_url": "https://example.com/x.png",
            "lessons_count": 1,
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert cr.status_code == 201, cr.text

    r = client.post(
        "/api/v1/payments/checkout",
        json={"course_slug": slug, "amount_cents": 100, "currency": "USD"},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r.status_code == 403, r.text


def test_checkout_enrolls_student(client) -> None:
    ins = _instructor(client, "ins-pay-own@example.com")
    st = _student(client, "stu-pay-checkout@example.com")
    tok_ins = ins["access_token"]
    tok_st = st["access_token"]
    slug = "pay-checkout-stu"
    cr = client.post(
        "/api/v1/courses",
        json={
            "slug": slug,
            "title": "Paid course",
            "description": "d" * 20,
            "image_url": "https://example.com/x.png",
            "lessons_count": 1,
        },
        headers={"Authorization": f"Bearer {tok_ins}"},
    )
    assert cr.status_code == 201, cr.text

    r = client.post(
        "/api/v1/payments/checkout",
        json={"course_slug": slug, "amount_cents": 2500, "currency": "USD"},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "completed"
    assert body["amount_cents"] == 2500

    er = client.post(
        "/api/v1/enrollments",
        json={"course_slug": slug},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert er.status_code == 409, er.text
