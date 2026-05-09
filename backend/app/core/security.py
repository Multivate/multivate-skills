from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(
    subject: str,
    expires_delta: timedelta,
    token_type: str,
) -> str:
    now = datetime.now(timezone.utc)
    exp = now + expires_delta
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(user_id: UUID) -> str:
    expire = timedelta(minutes=settings.access_token_expire_minutes)
    return _create_token(str(user_id), expire, "access")


def create_refresh_token(user_id: UUID) -> str:
    expire = timedelta(days=settings.refresh_token_expire_days)
    return _create_token(str(user_id), expire, "refresh")


def create_mfa_pending_token(user_id: UUID, challenge_id: UUID) -> str:
    """Short-lived token after password check; exchange with email OTP for session tokens."""
    expire = timedelta(minutes=10)
    now = datetime.now(timezone.utc)
    exp = now + expire
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "cid": str(challenge_id),
        "type": "mfa_pending",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_mfa_pending_token(token: str) -> tuple[UUID, UUID]:
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    if payload.get("type") != "mfa_pending":
        raise JWTError("Invalid token type")
    sub = payload.get("sub")
    cid = payload.get("cid")
    if not sub or not cid:
        raise JWTError("Missing subject or challenge id")
    return UUID(str(sub)), UUID(str(cid))


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def verify_token_type(payload: dict[str, Any], expected: str) -> UUID:
    if payload.get("type") != expected:
        raise JWTError("Invalid token type")
    sub = payload.get("sub")
    if not sub:
        raise JWTError("Missing subject")
    return UUID(str(sub))
