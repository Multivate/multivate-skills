from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.role import UserRole
from app.models.user import User


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT


class UserPublic(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    two_factor_enabled: bool = False
    authenticator_enabled: bool = False
    avatar_url: str | None = None
    preferred_locale: str = "en"
    profile_public: bool = False
    public_slug: str | None = None
    public_headline: str = ""
    public_bio: str = ""
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    preferred_locale: str | None = Field(default=None, min_length=2, max_length=8)
    profile_public: bool | None = None
    public_headline: str | None = Field(default=None, max_length=255)
    public_bio: str | None = Field(default=None, max_length=4000)


class PublicStudentProfile(BaseModel):
    slug: str
    name: str
    headline: str
    bio: str
    avatar_url: str | None = None
    created_at: datetime


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


def user_public_from_orm(user: User) -> UserPublic:
    """Serialize ORM User for API responses; avoids 500 when legacy rows have blank names."""
    name = (user.name or "").strip()
    if not name:
        name = "Member"
    return UserPublic(
        id=user.id,
        name=name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        two_factor_enabled=user.two_factor_enabled,
        authenticator_enabled=bool(getattr(user, "authenticator_enabled", False)),
        avatar_url=user.avatar_url,
        preferred_locale=getattr(user, "preferred_locale", None) or "en",
        profile_public=bool(getattr(user, "profile_public", False)),
        public_slug=getattr(user, "public_slug", None),
        public_headline=getattr(user, "public_headline", None) or "",
        public_bio=getattr(user, "public_bio", None) or "",
        created_at=user.created_at,
    )
