"""Time-based one-time passwords for the admin authenticator app."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User


def _normalize_secret(secret: str) -> bytes:
    padded = secret.strip().upper()
    padded += "=" * ((8 - len(padded) % 8) % 8)
    return base64.b32decode(padded, casefold=True)


def _code_at(secret: str, moment: int) -> str:
    counter = int(moment // 30)
    digest = hmac.new(_normalize_secret(secret), struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{binary % 1_000_000:06d}"


def verify_totp(secret: str, code: str) -> bool:
    cleaned = "".join(ch for ch in code if ch.isdigit())
    if len(cleaned) != 6:
        return False
    now = int(time.time())
    return any(hmac.compare_digest(_code_at(secret, now + drift), cleaned) for drift in (-30, 0, 30))


def new_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def otpauth_uri(email: str, secret: str) -> str:
    label = quote(f"Multivate:{email}")
    return f"otpauth://totp/{label}?secret={secret}&issuer=Multivate&algorithm=SHA1&digits=6&period=30"


def security_status(user: User) -> dict:
    return {
        "email_code_enabled": bool(user.two_factor_enabled),
        "authenticator_enabled": bool(user.authenticator_enabled),
    }


def start_authenticator(db: Session, user: User) -> dict:
    if user.authenticator_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authenticator is already on.")
    secret = new_secret()
    user.authenticator_secret = secret
    user.authenticator_enabled = False
    db.add(user)
    db.commit()
    return {"secret": secret, "otpauth_uri": otpauth_uri(user.email, secret)}


def confirm_authenticator(db: Session, user: User, code: str) -> None:
    secret = (user.authenticator_secret or "").strip()
    if not secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start authenticator setup first.")
    if not verify_totp(secret, code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That code does not match the authenticator.")
    user.authenticator_enabled = True
    db.add(user)
    db.commit()


def require_authenticator(user: User) -> None:
    if not user.authenticator_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Turn on the authenticator before opening system logs.",
        )
