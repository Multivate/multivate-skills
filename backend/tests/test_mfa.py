"""Email OTP MFA on login: challenge then /auth/login/mfa."""

from __future__ import annotations

from unittest.mock import patch
from uuid import UUID

from app.core.database import SessionLocal
from app.models.user import User
from tests.registration_utils import register_student_complete

PROFILE = {
    "education_level": "bachelors",
    "current_skills": "x",
    "skills_to_learn": "y",
    "learning_goals": "z",
    "preferred_formats": "video",
    "weekly_hours": "5-10",
    "career_direction": "up",
}


def _register_student(client, email: str) -> dict:
    body = {
        "name": "Mfa Learner",
        "email": email,
        "password": "password123",
        "learning_profile": PROFILE,
    }
    return register_student_complete(client, body)


def _enable_2fa_for_user(user_id_str: str) -> None:
    uid = UUID(user_id_str)
    db = SessionLocal()
    try:
        u = db.get(User, uid)
        assert u is not None
        u.two_factor_enabled = True
        db.commit()
    finally:
        db.close()


def test_login_returns_mfa_challenge_then_mfa_completes(client) -> None:
    reg = _register_student(client, "mfa-user@example.com")
    _enable_2fa_for_user(reg["user"]["id"])

    with patch("app.services.mfa_service._new_six_digit_code", return_value="424242"):
        r = client.post(
            "/api/v1/auth/login",
            json={"email": "mfa-user@example.com", "password": "password123"},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("mfa_required") is True
    assert isinstance(body.get("mfa_token"), str) and body["mfa_token"]
    assert "@" in (body.get("email_masked") or "")
    assert body.get("dev_otp") == "424242"

    r2 = client.post(
        "/api/v1/auth/login/mfa",
        json={"mfa_token": body["mfa_token"], "code": "424242"},
    )
    assert r2.status_code == 200, r2.text
    tokens = r2.json()
    assert "access_token" in tokens and "refresh_token" in tokens
    assert tokens["user"]["email"] == "mfa-user@example.com"
