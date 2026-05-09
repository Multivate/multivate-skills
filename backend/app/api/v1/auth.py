from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    InstructorRegisterRequest,
    LoginMfaRequired,
    LoginRequest,
    MfaDisableRequest,
    MfaEnableConfirmRequest,
    MfaVerifyRequest,
    RegisterStartResponse,
    RegisterVerifyRequest,
    StudentRegisterRequest,
    TokenPair,
)
from app.schemas.user import UserPublic, user_public_from_orm
from app.services import auth_service, signup_otp_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/student/start", response_model=RegisterStartResponse)
def register_student_start(
    data: StudentRegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> RegisterStartResponse:
    """Send a 5-minute email OTP; complete with POST /register/student/verify."""
    return signup_otp_service.start_student_signup(db, data)


@router.post("/register/student/verify", response_model=AuthResponse, status_code=201)
def register_student_verify(
    data: RegisterVerifyRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    """Verify OTP from Redis and create the student account + JWT."""
    return signup_otp_service.verify_student_signup(db, data.signup_token, data.code)


@router.post("/register/instructor/start", response_model=RegisterStartResponse)
def register_instructor_start(
    data: InstructorRegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> RegisterStartResponse:
    """Send a 5-minute email OTP; complete with POST /register/instructor/verify."""
    return signup_otp_service.start_instructor_signup(db, data)


@router.post("/register/instructor/verify", response_model=AuthResponse, status_code=201)
def register_instructor_verify(
    data: RegisterVerifyRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    """Verify OTP from Redis and create the instructor account + JWT."""
    return signup_otp_service.verify_instructor_signup(db, data.signup_token, data.code)


@router.post("/login")
def login_account(
    data: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse | LoginMfaRequired:
    """Returns session tokens, or `{ mfa_required, mfa_token, email_masked }` when 2FA is enabled."""
    return auth_service.login_user(db, data)


@router.post("/login/mfa", response_model=AuthResponse)
def login_mfa_verify(
    data: MfaVerifyRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    """Exchange MFA pending token + email OTP for access and refresh tokens."""
    return auth_service.complete_mfa_login(db, data)


@router.post("/mfa/enable/start", status_code=204)
def mfa_enable_start(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Send a confirmation code to your email before turning on 2FA."""
    auth_service.start_mfa_enable(db, user)


@router.post("/mfa/enable/confirm", status_code=204)
def mfa_enable_confirm(
    data: MfaEnableConfirmRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Confirm the emailed code to enable 2FA on your account."""
    auth_service.confirm_mfa_enable(db, user, data)


@router.post("/mfa/disable", status_code=204)
def mfa_disable(
    data: MfaDisableRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Turn off email 2FA (requires account password)."""
    auth_service.disable_mfa(db, user, data)


class RefreshBody(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenPair)
def refresh_session(
    body: RefreshBody,
    db: Annotated[Session, Depends(get_db)],
) -> TokenPair:
    return auth_service.refresh_tokens_for_user(db, body.refresh_token)


@router.get("/me", response_model=UserPublic)
def read_me(current: Annotated[User, Depends(get_current_user)]) -> UserPublic:
    return user_public_from_orm(current)
