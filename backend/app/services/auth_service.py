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
from app.core.rate_limit import enforce_rate_limit
from app.schemas.instructor_profile import InstructorTeachingProfileUpsert
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
            instructor_profile_service.upsert_instructor_profile(
                db,
                user.id,
                InstructorTeachingProfileUpsert(
                    expertise_areas="German language",
                    teaching_bio="Course instructor.",
                    subjects_taught="German",
                    teaching_formats="online",
                ),
            )


def login_user(db: Session, data: LoginRequest) -> AuthResponse | LoginMfaRequired:
    email_key = str(data.email).lower().strip()
    enforce_rate_limit(
        f"login:email:{email_key}",
        limit=10,
        window_sec=900,
        detail="Too many sign-in attempts. Please wait and try again.",
    )
    try:
        user = db.execute(select(User).where(User.email == email_key)).scalar_one_or_none()
    except LookupError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        ) from None
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
    # Optional extra step only when the user has enabled email 2FA in settings.
    if user.two_factor_enabled:
        try:
            mfa_token, masked, dev_plain = mfa_service.begin_login_mfa(db, user)
        except EmailDeliveryError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        include_dev_otp = bool(mail_service.expose_dev_otp_if_allowed(dev_plain))
        return LoginMfaRequired(
            mfa_token=mfa_token,
            email_masked=masked,
            dev_otp=dev_plain if include_dev_otp else None,
        )
    tokens = _tokens_for_user(user)
    return AuthResponse(**tokens.model_dump(), user=user_public_from_orm(user))


def start_code_login(db: Session, email: str) -> LoginMfaRequired:
    """Passwordless sign-in: send a one-time email code (no password required)."""
    email_key = str(email).lower().strip()
    enforce_rate_limit(
        f"login-code:email:{email_key}",
        limit=8,
        window_sec=900,
        detail="Too many code requests. Please wait and try again.",
    )
    user = db.execute(select(User).where(User.email == email_key)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found for that email.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    _require_profile_for_session(db, user)
    try:
        mfa_token, masked, dev_plain = mfa_service.begin_login_mfa(db, user)
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    include_dev_otp = bool(mail_service.expose_dev_otp_if_allowed(dev_plain))
    return LoginMfaRequired(
        mfa_token=mfa_token,
        email_masked=masked,
        dev_otp=dev_plain if include_dev_otp else None,
    )


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


def record_learning_choice(db: Session, user: User, topic: str, learn_with: str) -> None:
    """Store the sign-in questions on the account and on the role profile."""
    user.learn_topic = topic
    user.learn_with = learn_with
    if user.role == UserRole.STUDENT:
        row = db.execute(
            select(StudentLearningProfile).where(StudentLearningProfile.user_id == user.id)
        ).scalar_one_or_none()
        from app.services.learning_intent import profile_write_fields

        fields = profile_write_fields(
            {
                "education_level": getattr(row, "education_level", None) if row else "other",
                "current_skills": getattr(row, "current_skills", None) if row else None,
                "skills_to_learn": topic,
                "learning_goals": getattr(row, "learning_goals", None) if row else None,
                "preferred_formats": getattr(row, "preferred_formats", None) if row else "Online (self-paced)",
                "weekly_hours": getattr(row, "weekly_hours", None) if row else "5to10",
                "career_direction": getattr(row, "career_direction", None) if row else None,
                "goal_code": getattr(row, "goal_code", None) if row else None,
                "german_level": getattr(row, "german_level", None) if row else None,
                "instruction_locale": learn_with,
                "extra_notes": getattr(row, "extra_notes", None) if row else None,
                "study_mode": getattr(row, "study_mode", None) if row else None,
                "campus_location": getattr(row, "campus_location", None) if row else None,
                "cohort_name": getattr(row, "cohort_name", None) if row else None,
            }
        )
        if row is None:
            row = StudentLearningProfile(user_id=user.id, **fields)
            db.add(row)
        else:
            for key, val in fields.items():
                setattr(row, key, val)
    elif user.role == UserRole.INSTRUCTOR:
        row = db.execute(
            select(InstructorTeachingProfile).where(InstructorTeachingProfile.user_id == user.id)
        ).scalar_one_or_none()
        if row is not None:
            row.expertise_areas = topic
            row.subjects_taught = f"Teach with {learn_with}"
            notes = (row.credentials_notes or "").strip()
            if not notes or notes.startswith("teach_with:"):
                row.credentials_notes = f"teach_with:{learn_with}"
    db.commit()


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
                User.authenticator_secret,
                User.authenticator_enabled,
                User.student_code,
                User.avatar_url,
                User.learn_topic,
                User.learn_with,
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
