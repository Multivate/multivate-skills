"""Enrollment is limited to student accounts (learners)."""

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


def _register_student(client, email: str) -> dict:
    body = {
        "name": "Learner",
        "email": email,
        "password": "password123",
        "learning_profile": PROFILE,
    }
    return register_student_complete(client, body)


def _register_instructor(client, email: str) -> dict:
    body = {
        "name": "Teacher",
        "email": email,
        "password": "password123",
        "teaching_profile": TEACH,
    }
    return register_instructor_complete(client, body)


def test_instructor_cannot_enroll_as_learner(client) -> None:
    ins = _register_instructor(client, "ins-enroll@example.com")
    tok = ins["access_token"]
    slug = "no-enroll-ins"
    cr = client.post(
        "/api/v1/courses",
        json={
            "slug": slug,
            "title": "Ins course",
            "description": "d" * 20,
            "image_url": "https://example.com/x.png",
            "lessons_count": 1,
        },
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert cr.status_code == 201, cr.text

    er = client.post(
        "/api/v1/enrollments",
        json={"course_slug": slug},
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert er.status_code == 403, er.text
    assert "student" in er.json().get("detail", "").lower()


def test_student_can_enroll(client) -> None:
    ins = _register_instructor(client, "ins-own@example.com")
    st = _register_student(client, "stu-enroll@example.com")
    tok_ins = ins["access_token"]
    tok_st = st["access_token"]
    slug = "stu-enroll-course"
    cr = client.post(
        "/api/v1/courses",
        json={
            "slug": slug,
            "title": "For student",
            "description": "d" * 20,
            "image_url": "https://example.com/x.png",
            "lessons_count": 2,
        },
        headers={"Authorization": f"Bearer {tok_ins}"},
    )
    assert cr.status_code == 201, cr.text

    er = client.post(
        "/api/v1/enrollments",
        json={"course_slug": slug},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert er.status_code == 204, er.text


def test_admin_enrollment_row_includes_instructor(client) -> None:
    """Regression: admin enrollment list joins course instructor."""
    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.core.security import hash_password
    from app.models.role import UserRole
    from app.models.user import User

    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.email == "adm-e@example.com")).scalar_one_or_none()
        if not existing:
            db.add(
                User(
                    name="Admin E",
                    email="adm-e@example.com",
                    password_hash=hash_password("password123"),
                    role=UserRole.ADMIN,
                    is_active=True,
                    two_factor_enabled=False,
                )
            )
            db.commit()
    finally:
        db.close()

    ins = _register_instructor(client, "ins-adm-e@example.com")
    st = _register_student(client, "stu-adm-e@example.com")
    tok_ins = ins["access_token"]
    tok_st = st["access_token"]
    r_login = client.post("/api/v1/auth/login", json={"email": "adm-e@example.com", "password": "password123"})
    assert r_login.status_code == 200, r_login.text
    tok_adm = r_login.json()["access_token"]

    slug = "adm-e-course"
    cr = client.post(
        "/api/v1/courses",
        json={
            "slug": slug,
            "title": "Adm E Course",
            "description": "d" * 20,
            "image_url": "https://example.com/x.png",
            "lessons_count": 1,
        },
        headers={"Authorization": f"Bearer {tok_ins}"},
    )
    assert cr.status_code == 201, cr.text

    er = client.post(
        "/api/v1/enrollments",
        json={"course_slug": slug},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert er.status_code == 204, er.text

    lst = client.get("/api/v1/admin/enrollments?limit=50", headers={"Authorization": f"Bearer {tok_adm}"})
    assert lst.status_code == 200, lst.text
    rows = lst.json()
    assert isinstance(rows, list) and rows
    hit = next((x for x in rows if x.get("course_slug") == slug), None)
    assert hit is not None
    assert hit.get("instructor_name") == "Teacher"
    assert hit.get("instructor_email") == "ins-adm-e@example.com"
