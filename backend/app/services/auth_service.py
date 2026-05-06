from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.role import UserRole
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TokenPair
from app.schemas.user import UserPublic
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    verify_token_type,
)


def _tokens_for_user(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


def register_user(db: Session, data: RegisterRequest) -> AuthResponse:
    if data.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot register as admin via public API",
        )
    existing = db.execute(select(User).where(User.email == str(data.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        name=data.name,
        email=str(data.email).lower(),
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    tokens = _tokens_for_user(user)
    return AuthResponse(**tokens.model_dump(), user=UserPublic.model_validate(user))


def login_user(db: Session, data: LoginRequest) -> AuthResponse:
    user = db.execute(select(User).where(User.email == str(data.email).lower())).scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    tokens = _tokens_for_user(user)
    return AuthResponse(**tokens.model_dump(), user=UserPublic.model_validate(user))


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.get(User, user_id)


def refresh_tokens_for_user(db: Session, refresh_token: str) -> TokenPair:
    """Validate refresh token and load user from DB before issuing new tokens."""
    try:
        payload = decode_token(refresh_token)
        user_id = verify_token_type(payload, "refresh")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc
    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _tokens_for_user(user)
