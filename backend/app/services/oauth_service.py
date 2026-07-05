from __future__ import annotations

import json
import logging
import secrets
import time
from typing import Any, Literal
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import redis_client
from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token
from app.models.role import UserRole
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User
from app.schemas.auth import AuthResponse, OAuthCompleteResponse, TokenPair
from app.schemas.user import user_public_from_orm

_logger = logging.getLogger(__name__)

_OAUTH_PREFIX = "multivate:oauth:state:"
_OAUTH_TTL_SEC = 600

Provider = Literal["google", "apple"]


def _redis() -> Any:
    return redis_client.get_redis()


def _state_key(state: str) -> str:
    return f"{_OAUTH_PREFIX}{state}"


def _save_state(state: str, payload: dict[str, str]) -> None:
    _redis().setex(_state_key(state), _OAUTH_TTL_SEC, json.dumps(payload))
    _logger.info("OAuth state stored provider=%s return_to=%s", payload.get("provider"), payload.get("return_to"))


def _pop_state(state: str) -> dict[str, str]:
    key = _state_key(state)
    raw = _redis().get(key)
    if raw:
        _redis().delete(key)
    if not raw:
        _logger.warning("OAuth state missing or expired state=%s…", state[:8])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sign-in session expired. Please try again.")
    data = json.loads(raw)
    _logger.info("OAuth state validated provider=%s", data.get("provider"))
    return data


def _tokens_for_user(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


def _redirect_uri(provider: Provider) -> str:
    base = get_settings().frontend_url.rstrip("/")
    return f"{base}/api/auth/oauth/{provider}/callback"


def _require_google_config() -> tuple[str, str]:
    s = get_settings()
    client_id = (s.google_client_id or "").strip()
    client_secret = (s.google_client_secret or "").strip()
    if not client_id or not client_secret:
        _logger.error("Google OAuth not configured (missing client id/secret)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not available right now.",
        )
    return client_id, client_secret


def _require_apple_config() -> tuple[str, str, str, str, str]:
    s = get_settings()
    client_id = (s.apple_client_id or "").strip()
    team_id = (s.apple_team_id or "").strip()
    key_id = (s.apple_key_id or "").strip()
    private_key = (s.apple_private_key or "").replace("\\n", "\n").strip()
    if not all([client_id, team_id, key_id, private_key]):
        _logger.error("Apple OAuth not configured (missing client/team/key/private key)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Apple sign-in is not available right now.",
        )
    return client_id, team_id, key_id, private_key, client_id


def _apple_client_secret(client_id: str, team_id: str, key_id: str, private_key: str) -> str:
    now = int(time.time())
    payload = {
        "iss": team_id,
        "iat": now,
        "exp": now + 86400 * 150,
        "aud": "https://appleid.apple.com",
        "sub": client_id,
    }
    return jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": key_id})


def google_authorize_url(return_to: str) -> str:
    client_id, _ = _require_google_config()
    state = secrets.token_urlsafe(32)
    _save_state(state, {"provider": "google", "return_to": return_to or "/dashboard"})
    params = {
        "client_id": client_id,
        "redirect_uri": _redirect_uri("google"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    _logger.info("Google OAuth authorize URL ready return_to=%s", return_to)
    return url


def apple_authorize_url(return_to: str) -> str:
    client_id, _, _, _, _ = _require_apple_config()
    state = secrets.token_urlsafe(32)
    _save_state(state, {"provider": "apple", "return_to": return_to or "/dashboard"})
    params = {
        "client_id": client_id,
        "redirect_uri": _redirect_uri("apple"),
        "response_type": "code",
        "scope": "name email",
        "response_mode": "form_post",
        "state": state,
    }
    url = f"https://appleid.apple.com/auth/authorize?{urlencode(params)}"
    _logger.info("Apple OAuth authorize URL ready return_to=%s", return_to)
    return url


def _ensure_student_profile(db: Session, user_id: Any) -> None:
    existing = db.execute(
        select(StudentLearningProfile).where(StudentLearningProfile.user_id == user_id)
    ).scalar_one_or_none()
    if existing:
        return
    db.add(
        StudentLearningProfile(
            user_id=user_id,
            education_level="other",
            skills_to_learn="General",
            preferred_formats="Online (self-paced)",
            weekly_hours="5to10",
        )
    )
    _logger.info("Created default student learning profile user_id=%s", user_id)


def _oauth_key(provider: Provider, subject: str) -> str:
    return f"{provider}:{subject}"


def _upsert_oauth_user(
    db: Session,
    *,
    provider: Provider,
    subject: str,
    email: str,
    name: str,
) -> User:
    email_key = email.lower().strip()
    if not email_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="We couldn't read your email from the provider.")

    oauth_key = _oauth_key(provider, subject)
    user = db.execute(select(User).where(User.oauth_subject == oauth_key)).scalar_one_or_none()

    if user is None:
        user = db.execute(select(User).where(User.email == email_key)).scalar_one_or_none()
        if user:
            _logger.info("Linking OAuth %s to existing account email=%s", provider, email_key)
            user.oauth_subject = oauth_key
            if name.strip() and user.name.strip() in ("", "User"):
                user.name = name.strip()
        else:
            _logger.info("Creating new student via OAuth %s email=%s", provider, email_key)
            user = User(
                name=name.strip() or email_key.split("@")[0],
                email=email_key,
                password_hash=None,
                role=UserRole.STUDENT,
                is_active=True,
                two_factor_enabled=False,
                auth_provider=provider,
                oauth_subject=oauth_key,
            )
            db.add(user)
            db.flush()
            _ensure_student_profile(db, user.id)

    if user.role == UserRole.STUDENT:
        _ensure_student_profile(db, user.id)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    db.commit()
    db.refresh(user)
    return user


async def complete_google(db: Session, *, code: str, state: str) -> OAuthCompleteResponse:
    stored = _pop_state(state)
    if stored.get("provider") != "google":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sign-in session.")

    client_id, client_secret = _require_google_config()
    redirect_uri = _redirect_uri("google")
    _logger.info("Exchanging Google authorization code redirect_uri=%s", redirect_uri)

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            _logger.error("Google token exchange failed status=%s body=%s", token_res.status_code, token_res.text[:240])
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google sign-in failed. Please try again.")

        token_body = token_res.json()
        access = token_body.get("access_token")
        if not access:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google sign-in failed. Please try again.")

        profile_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access}"},
        )
        if profile_res.status_code != 200:
            _logger.error("Google userinfo failed status=%s", profile_res.status_code)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google sign-in failed. Please try again.")

        profile = profile_res.json()

    subject = str(profile.get("sub") or "")
    email = str(profile.get("email") or "")
    name = str(profile.get("name") or "")
    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google sign-in failed. Please try again.")

    user = _upsert_oauth_user(db, provider="google", subject=subject, email=email, name=name)
    tokens = _tokens_for_user(user)
    return_to = stored.get("return_to") or "/dashboard"
    _logger.info("Google OAuth sign-in complete user_id=%s return_to=%s", user.id, return_to)
    return OAuthCompleteResponse(**tokens.model_dump(), user=user_public_from_orm(user), return_to=return_to)


async def complete_apple(
    db: Session,
    *,
    code: str,
    state: str,
    name_hint: str | None = None,
) -> OAuthCompleteResponse:
    stored = _pop_state(state)
    if stored.get("provider") != "apple":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid sign-in session.")

    client_id, team_id, key_id, private_key, _ = _require_apple_config()
    redirect_uri = _redirect_uri("apple")
    client_secret = _apple_client_secret(client_id, team_id, key_id, private_key)
    _logger.info("Exchanging Apple authorization code redirect_uri=%s", redirect_uri)

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_res = await client.post(
            "https://appleid.apple.com/auth/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        if token_res.status_code != 200:
            _logger.error("Apple token exchange failed status=%s body=%s", token_res.status_code, token_res.text[:240])
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple sign-in failed. Please try again.")

        token_body = token_res.json()
        id_token = token_body.get("id_token")
        if not id_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple sign-in failed. Please try again.")

    claims = jwt.get_unverified_claims(id_token)
    subject = str(claims.get("sub") or "")
    email = str(claims.get("email") or "")
    if not subject:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple sign-in failed. Please try again.")

    display_name = (name_hint or "").strip() or email.split("@")[0] if email else "Apple user"
    user = _upsert_oauth_user(db, provider="apple", subject=subject, email=email, name=display_name)
    tokens = _tokens_for_user(user)
    return_to = stored.get("return_to") or "/dashboard"
    _logger.info("Apple OAuth sign-in complete user_id=%s return_to=%s", user.id, return_to)
    return OAuthCompleteResponse(**tokens.model_dump(), user=user_public_from_orm(user), return_to=return_to)
