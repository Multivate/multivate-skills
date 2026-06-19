from __future__ import annotations

import json
import logging
import secrets
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import redis_client
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import ForgotPasswordResetRequest, ForgotPasswordStartRequest, ForgotPasswordStartResponse
from app.schemas.user import ChangePasswordRequest, UpdateProfileRequest, UserPublic, user_public_from_orm
from app.services import mail_service, otp_email
from app.services.mail_service import EmailDeliveryError
from app.services.media_storage_service import save_user_avatar

_logger = logging.getLogger(__name__)

_RESET_PREFIX = "multivate:reset:v1:"
_RESET_TTL_SEC = 900


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    if len(local) <= 1:
        return f"{local[0]}***@{domain}"
    return f"{local[0]}***@{domain}"


def _new_six_digit_code() -> str:
    return f"{secrets.randbelow(900_000) + 100_000:06d}"


def _normalize_otp(code: str) -> str:
    return "".join(c for c in code if c.isdigit())


def update_profile(db: Session, user: User, payload: UpdateProfileRequest) -> UserPublic:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    user.name = name
    db.add(user)
    db.commit()
    db.refresh(user)
    _logger.info("profile updated user_id=%s", user.id)
    return user_public_from_orm(user)


async def upload_avatar(db: Session, user: User, file: UploadFile) -> UserPublic:
    stored = await save_user_avatar(user.id, file)
    user.avatar_url = stored.public_path
    db.add(user)
    db.commit()
    db.refresh(user)
    _logger.info("avatar updated user_id=%s path=%s", user.id, stored.public_path)
    return user_public_from_orm(user)


def change_password(db: Session, user: User, payload: ChangePasswordRequest) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a different password")
    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    _logger.info("password changed user_id=%s", user.id)


def start_forgot_password(db: Session, payload: ForgotPasswordStartRequest) -> ForgotPasswordStartResponse:
    email = str(payload.email).lower().strip()
    from app.core.rate_limit import enforce_rate_limit

    enforce_rate_limit(
        f"forgot:email:{email}",
        limit=5,
        window_sec=3600,
        detail="Too many reset requests. Try again later.",
    )
    user = db.scalar(select(User).where(User.email == email))
    reset_token = secrets.token_urlsafe(32)
    dev_otp: str | None = None

    if user and user.is_active:
        code = _new_six_digit_code()
        r = redis_client.get_redis()
        r.setex(
            f"{_RESET_PREFIX}{reset_token}",
            _RESET_TTL_SEC,
            json.dumps({"email": email, "code": code, "user_id": str(user.id)}),
        )
        try:
            sent = otp_email.send_password_reset_code(user.name, email, code)
            if sent:
                _logger.warning(
                    "password reset email not sent; dev fallback code logged for email=%s",
                    email,
                )
                dev_otp = sent
        except EmailDeliveryError as exc:
            r.delete(f"{_RESET_PREFIX}{reset_token}")
            _logger.warning("password reset email blocked recipient=%s: %s", email, exc)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        except Exception:
            _logger.exception("password reset email failed email=%s", email)
            dev_otp = code
    else:
        _logger.info("forgot password requested for unknown/inactive email=%s", email)

    return ForgotPasswordStartResponse(
        reset_token=reset_token,
        email_masked=_mask_email(email),
        dev_otp=mail_service.expose_dev_otp_if_allowed(dev_otp),
    )


def reset_forgot_password(db: Session, payload: ForgotPasswordResetRequest) -> None:
    r = redis_client.get_redis()
    raw = r.get(f"{_RESET_PREFIX}{payload.reset_token}")
    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link expired. Request a new code.")
    data: dict[str, Any] = json.loads(raw)
    expected = _normalize_otp(str(data.get("code", "")))
    provided = _normalize_otp(payload.code)
    if not expected or expected != provided:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect verification code")

    user_id = data.get("user_id")
    user = db.get(User, user_id) if user_id else None
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account not found")

    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    r.delete(f"{_RESET_PREFIX}{payload.reset_token}")
    _logger.info("password reset completed user_id=%s", user.id)
