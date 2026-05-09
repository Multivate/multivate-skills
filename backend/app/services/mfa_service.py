from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from email.utils import parseaddr
from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.mfa_otp_challenge import MfaOtpChallenge
from app.models.user import User
from app.core.security import create_mfa_pending_token, hash_password, verify_password
from app.services import mail_service
from app.services import otp_email

_logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    if len(local) <= 1:
        return f"{local[0]}***@{domain}"
    return f"{local[0]}***@{domain}"


def _new_six_digit_code() -> str:
    return f"{secrets.randbelow(900_000) + 100_000:06d}"


def _first_name(user: User) -> str:
    name = (user.name or "").strip()
    if not name:
        return "there"
    return name.split()[0]


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


def create_and_send_otp(
    db: Session,
    user: User,
    purpose: str,
) -> tuple[MfaOtpChallenge, str | None]:
    """Create OTP challenge, send via configured provider; second value is plaintext OTP in dev when mail is skipped."""
    now = datetime.now(timezone.utc)
    code = _new_six_digit_code()
    ch = MfaOtpChallenge(
        user_id=user.id,
        purpose=purpose,
        code_hash=hash_password(code),
        expires_at=now + timedelta(minutes=otp_email.OTP_EXPIRY_MINUTES),
    )
    open_rows = (
        db.execute(
            select(MfaOtpChallenge).where(
                MfaOtpChallenge.user_id == user.id,
                MfaOtpChallenge.purpose == purpose,
                MfaOtpChallenge.consumed_at.is_(None),
            )
        )
        .scalars()
        .all()
    )
    for row in open_rows:
        row.consumed_at = now
        db.add(row)
    db.add(ch)
    db.commit()
    db.refresh(ch)

    first = _first_name(user)
    support = _support_href()
    footer = _footer_line()
    use_logo = otp_email.resolve_brand_logo_path() is not None

    if purpose == "login":
        subject = "Multivate: Here's your 6-digit sign-in code"
        lead = "Use the code below to finish signing in to your Multivate account."
        ctx = "Your verification code:"
    elif purpose == "signup":
        subject = "Multivate: Welcome — your 6-digit verification code"
        lead = "Thanks for creating your Multivate account."
        ctx = "Use the code below to verify this email address:"
    elif purpose == "enable":
        subject = "Multivate: Confirm two-factor authentication"
        lead = "You asked to turn on email verification (two-factor authentication) for your account."
        ctx = "Your confirmation code:"
    else:
        subject = "Multivate: Your verification code"
        lead = "Use this one-time code to complete your request in Multivate."
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
    )

    try:
        dev_plain = mail_service.send_plain_email(user.email, subject, plain, html_body)
    except Exception as exc:
        _logger.exception(
            "OTP send failed recipient=%s purpose=%s (%s)",
            user.email,
            purpose,
            type(exc).__name__,
        )
        if get_settings().environment == "development":
            _logger.warning("DEV: returning plaintext OTP for %s (email not sent).", user.email)
            return ch, code
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not send verification email. Set RESEND_API_KEY and RESEND_FROM on the server, then retry."
            ),
        ) from exc
    return ch, dev_plain


def _normalize_otp(code: str) -> str:
    digits = "".join(c for c in code if c.isdigit())
    return digits


def _as_utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def verify_otp_challenge(db: Session, user_id: UUID, challenge_id: UUID, code: str, purpose: str) -> None:
    row = db.get(MfaOtpChallenge, challenge_id)
    if not row or row.user_id != user_id or row.purpose != purpose:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    if row.consumed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code already used")
    now = datetime.now(timezone.utc)
    if _as_utc_aware(row.expires_at) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code expired")
    normalized = _normalize_otp(code)
    if len(normalized) != 6 or not verify_password(normalized, row.code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    row.consumed_at = now
    db.add(row)
    db.commit()


def begin_login_mfa(db: Session, user: User) -> tuple[str, str, str | None]:
    """Returns (mfa_jwt, masked_email, plaintext_otp_or_none_if_sent_via_resend)."""
    ch, dev_plain = create_and_send_otp(db, user, "login")
    token = create_mfa_pending_token(user.id, ch.id)
    return token, _mask_email(user.email), dev_plain


def complete_login_mfa(db: Session, mfa_token: str, code: str) -> User:
    from app.core.security import decode_mfa_pending_token

    try:
        user_id, challenge_id = decode_mfa_pending_token(mfa_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired verification session",
        ) from exc
    verify_otp_challenge(db, user_id, challenge_id, code, "login")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def start_enable_2fa(db: Session, user: User) -> None:
    if user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is already enabled",
        )
    _, _ = create_and_send_otp(db, user, "enable")


def confirm_enable_2fa(db: Session, user: User, code: str) -> None:
    row = (
        db.execute(
            select(MfaOtpChallenge)
            .where(
                MfaOtpChallenge.user_id == user.id,
                MfaOtpChallenge.purpose == "enable",
                MfaOtpChallenge.consumed_at.is_(None),
            )
            .order_by(MfaOtpChallenge.created_at.desc())
            .limit(1)
        )
        .scalars()
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request a verification code first",
        )
    verify_otp_challenge(db, user.id, row.id, code, "enable")
    u = db.get(User, user.id)
    if u:
        u.two_factor_enabled = True
        db.add(u)
        db.commit()


def disable_2fa(db: Session, user: User, password: str) -> None:
    if not user.two_factor_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not enabled",
        )
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect password")
    user.two_factor_enabled = False
    db.add(user)
    db.commit()
