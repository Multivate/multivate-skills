"""Redis-backed signup OTP (5 minutes): email + password + profile payload, verify then create user."""

from __future__ import annotations

import json
import logging
import secrets
from email.utils import parseaddr
from typing import Any, Literal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core import redis_client
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.instructor_teaching_profile import InstructorTeachingProfile
from app.models.role import UserRole
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    InstructorRegisterRequest,
    RegisterStartResponse,
    StudentRegisterRequest,
    TokenPair,
)
from app.schemas.user import user_public_from_orm
from app.services import mail_service, otp_email

_logger = logging.getLogger(__name__)

_SIGNUP_PREFIX = "multivate:signup:v1:"
_SIGNUP_TTL_SEC = 300
_SIGNUP_OTP_MINUTES = 5


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    if len(local) <= 1:
        return f"{local[0]}***@{domain}"
    return f"{local[0]}***@{domain}"


def _new_six_digit_code() -> str:
    return f"{secrets.randbelow(900_000) + 100_000:06d}"


def _first_name(name: str) -> str:
    n = (name or "").strip()
    if not n:
        return "there"
    return n.split()[0]


def _support_href() -> str:
    s = get_settings()
    raw = (s.mail_support_url or "").strip()
    if raw:
        return raw
    _, addr = parseaddr(s.mail_from)
    return f"mailto:{addr}" if addr else "#"


def _footer_line() -> str:
    line = (get_settings().mail_footer_line or "").strip()
    return line or "Delivered by Multivate - online learning and career skills."


def _normalize_otp(code: str) -> str:
    return "".join(c for c in code if c.isdigit())


def _redis_key(token: str) -> str:
    return f"{_SIGNUP_PREFIX}{token}"


def _send_signup_verification_email(to_email: str, display_name: str, code: str) -> str | None:
    first = _first_name(display_name)
    support = _support_href()
    footer = _footer_line()
    use_logo = otp_email.resolve_brand_logo_path() is not None
    subject = "Multivate: Verify your email to finish signing up"
    lead = "You are creating a Multivate account. Enter this code in the app to continue."
    ctx = "Your verification code:"
    plain, html_body = otp_email.build_otp_email(
        recipient_first_name=first,
        code=code,
        subject=subject,
        lead_in=lead,
        code_context_line=ctx,
        support_href=support,
        footer_line=footer,
        include_logo_cid=use_logo,
        expiry_minutes=_SIGNUP_OTP_MINUTES,
    )
    return mail_service.send_plain_email(to_email, subject, plain, html_body)


def _payload_for_student(data: StudentRegisterRequest) -> dict[str, Any]:
    d = data.model_dump(mode="json")
    pw = d.pop("password")
    d["password_hash"] = hash_password(str(pw))
    return {"kind": "student", "payload": d}


def _payload_for_instructor(data: InstructorRegisterRequest) -> dict[str, Any]:
    d = data.model_dump(mode="json")
    pw = d.pop("password")
    d["password_hash"] = hash_password(str(pw))
    return {"kind": "instructor", "payload": d}


def start_student_signup(db: Session, data: StudentRegisterRequest) -> RegisterStartResponse:
    email = str(data.email).lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    code = _new_six_digit_code()
    otp_hash = hash_password(code)
    body = {"otp_hash": otp_hash, **_payload_for_student(data)}
    token = secrets.token_urlsafe(32)
    r = redis_client.get_redis()
    r.setex(_redis_key(token), _SIGNUP_TTL_SEC, json.dumps(body))
    dev_plain: str | None = None
    try:
        dev_plain = _send_signup_verification_email(email, data.name, code)
    except Exception as exc:
        _logger.exception("Signup OTP email failed for %s", email)
        if get_settings().environment != "development":
            r.delete(_redis_key(token))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not send verification email. Set RESEND_API_KEY and RESEND_FROM, then try again.",
            ) from exc
        dev_plain = code
    include_dev = get_settings().environment == "development" and bool(dev_plain)
    return RegisterStartResponse(
        signup_token=token,
        email_masked=_mask_email(email),
        dev_otp=dev_plain if include_dev and len(str(dev_plain)) == 6 else None,
    )


def start_instructor_signup(db: Session, data: InstructorRegisterRequest) -> RegisterStartResponse:
    email = str(data.email).lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    code = _new_six_digit_code()
    otp_hash = hash_password(code)
    body = {"otp_hash": otp_hash, **_payload_for_instructor(data)}
    token = secrets.token_urlsafe(32)
    r = redis_client.get_redis()
    r.setex(_redis_key(token), _SIGNUP_TTL_SEC, json.dumps(body))
    dev_plain: str | None = None
    try:
        dev_plain = _send_signup_verification_email(email, data.name, code)
    except Exception as exc:
        _logger.exception("Signup OTP email failed for %s", email)
        if get_settings().environment != "development":
            r.delete(_redis_key(token))
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not send verification email. Set RESEND_API_KEY and RESEND_FROM, then try again.",
            ) from exc
        dev_plain = code
    include_dev = get_settings().environment == "development" and bool(dev_plain)
    return RegisterStartResponse(
        signup_token=token,
        email_masked=_mask_email(email),
        dev_otp=dev_plain if include_dev and len(str(dev_plain)) == 6 else None,
    )


def _tokens_for_user(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


def _create_student_from_payload(db: Session, payload: dict[str, Any]) -> AuthResponse:
    lp = payload["learning_profile"]
    user = User(
        name=payload["name"],
        email=str(payload["email"]).lower(),
        password_hash=payload["password_hash"],
        role=UserRole.STUDENT,
        is_active=True,
        two_factor_enabled=True,
    )
    db.add(user)
    db.flush()
    profile = StudentLearningProfile(
        user_id=user.id,
        education_level=lp["education_level"],
        current_skills=lp.get("current_skills"),
        skills_to_learn=lp["skills_to_learn"],
        learning_goals=lp["learning_goals"],
        preferred_formats=lp["preferred_formats"],
        weekly_hours=lp["weekly_hours"],
        career_direction=lp["career_direction"],
        extra_notes=lp.get("extra_notes"),
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    tokens = _tokens_for_user(user)
    return AuthResponse(**tokens.model_dump(), user=user_public_from_orm(user))


def _create_instructor_from_payload(db: Session, payload: dict[str, Any]) -> AuthResponse:
    tp = payload["teaching_profile"]
    user = User(
        name=payload["name"],
        email=str(payload["email"]).lower(),
        password_hash=payload["password_hash"],
        role=UserRole.INSTRUCTOR,
        is_active=True,
        two_factor_enabled=True,
    )
    db.add(user)
    db.flush()
    row = InstructorTeachingProfile(
        user_id=user.id,
        expertise_areas=tp["expertise_areas"],
        teaching_bio=tp["teaching_bio"],
        subjects_taught=tp["subjects_taught"],
        years_experience=tp.get("years_experience"),
        teaching_formats=tp.get("teaching_formats"),
        credentials_notes=tp.get("credentials_notes"),
        professional_links=tp.get("professional_links"),
    )
    db.add(row)
    db.commit()
    db.refresh(user)
    tokens = _tokens_for_user(user)
    return AuthResponse(**tokens.model_dump(), user=user_public_from_orm(user))


def verify_student_signup(db: Session, signup_token: str, code: str) -> AuthResponse:
    return _verify_and_create(db, signup_token, code, "student")


def verify_instructor_signup(db: Session, signup_token: str, code: str) -> AuthResponse:
    return _verify_and_create(db, signup_token, code, "instructor")


def _verify_and_create(db: Session, signup_token: str, code: str, expect: Literal["student", "instructor"]) -> AuthResponse:
    key = _redis_key(signup_token.strip())
    r = redis_client.get_redis()
    raw = r.get(key)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired signup session. Request a new code from the registration form.",
        )
    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        r.delete(key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signup session") from None

    kind = body.get("kind")
    if kind != expect:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signup session type")

    otp_hash = body.get("otp_hash")
    if not otp_hash or not isinstance(otp_hash, str):
        r.delete(key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signup session")

    normalized = _normalize_otp(code)
    if len(normalized) != 6 or not verify_password(normalized, otp_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    payload = body.get("payload")
    if not isinstance(payload, dict):
        r.delete(key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signup session")

    email = str(payload.get("email", "")).lower()
    if not email:
        r.delete(key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signup session")

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        r.delete(key)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    r.delete(key)
    if expect == "student":
        return _create_student_from_payload(db, payload)
    return _create_instructor_from_payload(db, payload)
