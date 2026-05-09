"""Two-step registration (Redis OTP) for API tests — avoids real outbound email."""

from __future__ import annotations

from typing import Any
from unittest.mock import patch

from fastapi.testclient import TestClient


def register_student_complete(client: TestClient, body: dict[str, Any], *, otp: str = "424242") -> dict[str, Any]:
    with patch("app.services.signup_otp_service._new_six_digit_code", return_value=otp), patch(
        "app.services.signup_otp_service._send_signup_verification_email",
        return_value=None,
    ):
        r1 = client.post("/api/v1/auth/register/student/start", json=body)
    assert r1.status_code == 200, r1.text
    token = r1.json()["signup_token"]
    r2 = client.post("/api/v1/auth/register/student/verify", json={"signup_token": token, "code": otp})
    assert r2.status_code == 201, r2.text
    return r2.json()


def register_instructor_complete(client: TestClient, body: dict[str, Any], *, otp: str = "424242") -> dict[str, Any]:
    with patch("app.services.signup_otp_service._new_six_digit_code", return_value=otp), patch(
        "app.services.signup_otp_service._send_signup_verification_email",
        return_value=None,
    ):
        r1 = client.post("/api/v1/auth/register/instructor/start", json=body)
    assert r1.status_code == 200, r1.text
    token = r1.json()["signup_token"]
    r2 = client.post("/api/v1/auth/register/instructor/verify", json={"signup_token": token, "code": otp})
    assert r2.status_code == 201, r2.text
    return r2.json()
