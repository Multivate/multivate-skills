from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.instructor_profile import InstructorTeachingProfileRegistration
from app.schemas.student_profile import StudentLearningProfileRegistration
from app.schemas.user import UserPublic


class StudentRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    learning_profile: StudentLearningProfileRegistration


class InstructorRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    teaching_profile: InstructorTeachingProfileRegistration


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthResponse(TokenPair):
    user: UserPublic


class LoginMfaRequired(BaseModel):
    """Password accepted; complete sign-in with the email OTP."""

    mfa_required: Literal[True] = True
    mfa_token: str
    email_masked: str
    dev_otp: str | None = Field(
        default=None,
        description="Only when ENVIRONMENT=development and RESEND_API_KEY is unset: the 6-digit code (not sent by email). "
        "Always null in staging/production.",
    )


class MfaVerifyRequest(BaseModel):
    mfa_token: str
    code: str = Field(..., min_length=1, max_length=32)


class MfaEnableConfirmRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=32)


class MfaDisableRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=128)


class RegisterStartResponse(BaseModel):
    signup_token: str
    email_masked: str
    dev_otp: str | None = Field(
        default=None,
        description="Development only: plaintext code when email could not be sent.",
    )


class RegisterVerifyRequest(BaseModel):
    signup_token: str
    code: str = Field(..., min_length=1, max_length=32)
