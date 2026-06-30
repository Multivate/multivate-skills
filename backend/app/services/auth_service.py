from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session, load_only

from app.models.instructor_teaching_profile import InstructorTeachingProfile
from app.models.role import UserRole
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginMfaRequired,
    LoginRequest,
    MfaDisableRequest,
    MfaEnableConfirmRequest,
    MfaVerifyRequest,
    TokenPair,
)
from app.schemas.user import user_public_from_orm
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
    verify_token_type,
)
from app.core.config import get_settings
from app.core.rate_limit import enforce_rate_limit
from app.services import instructor_profile_service
from app.services import learning_service
from app.services import mail_service
from app.services import mfa_service
from app.services.mail_service import EmailDeliveryError


def _tokens_for_user(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


def _require_profile_for_session(db: Session, user: User) -> None:
    """Students and instructors must have an onboarding profile row before receiving tokens."""
    if user.role == UserRole.STUDENT:
        if learning_service.get_student_profile(db, user.id) is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="profile_incomplete",
            )
    elif user.role == UserRole.INSTRUCTOR:
        if instructor_profile_service.get_instructor_profile(db, user.id) is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="profile_incomplete",
            )


def login_user(db: Session, data: LoginRequest) -> AuthResponse | LoginMfaRequired:
    email_key = str(data.email).lower().strip()
    enforce_rate_limit(
        f"login:email:{email_key}",
        limit=10,
        window_sec=900,
        detail="Too many sign-in attempts. Please wait and try again.",
    )
    user = db.execute(select(User).where(User.email == email_key)).scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    _require_profile_for_session(db, user)
    if user.two_factor_enabled:
        try:
            mfa_token, masked, dev_plain = mfa_service.begin_login_mfa(db, user)
        except EmailDeliveryError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        settings = get_settings()
        include_dev_otp = bool(mail_service.expose_dev_otp_if_allowed(dev_plain))
        return LoginMfaRequired(
            mfa_token=mfa_token,
            email_masked=masked,
            dev_otp=dev_plain if include_dev_otp else None,
        )
    tokens = _tokens_for_user(user)
    return AuthResponse(**tokens.model_dump(), user=user_public_from_orm(user))


def complete_mfa_login(db: Session, data: MfaVerifyRequest) -> AuthResponse:
    user = mfa_service.complete_login_mfa(db, data.mfa_token, data.code)
    _require_profile_for_session(db, user)
    tokens = _tokens_for_user(user)
    return AuthResponse(**tokens.model_dump(), user=user_public_from_orm(user))


def resend_login_mfa(db: Session, mfa_token: str) -> LoginMfaRequired:
    from jose import JWTError

    from app.core.security import decode_mfa_pending_token

    try:
        user_id, _ = decode_mfa_pending_token(mfa_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your sign-in session expired. Sign in again.",
        ) from exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in again to request a new code.",
        )
    try:
        new_token, masked, dev_plain = mfa_service.begin_login_mfa(db, user)
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    settings = get_settings()
    include_dev_otp = bool(mail_service.expose_dev_otp_if_allowed(dev_plain))
    return LoginMfaRequired(
        mfa_token=new_token,
        email_masked=masked,
        dev_otp=dev_plain if include_dev_otp else None,
    )


def start_mfa_enable(db: Session, user: User) -> None:
    mfa_service.start_enable_2fa(db, user)


def confirm_mfa_enable(db: Session, user: User, data: MfaEnableConfirmRequest) -> None:
    mfa_service.confirm_enable_2fa(db, user, data.code)


def disable_mfa(db: Session, user: User, data: MfaDisableRequest) -> None:
    mfa_service.disable_2fa(db, user, data.password)


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.execute(
        select(User)
        .options(
            load_only(
                User.id,
                User.name,
                User.email,
                User.role,
                User.is_active,
                User.two_factor_enabled,
                User.student_code,
                User.avatar_url,
            )
        )
        .where(User.id == user_id)
    ).scalar_one_or_none()


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
    _require_profile_for_session(db, user)
    return _tokens_for_user(user)
