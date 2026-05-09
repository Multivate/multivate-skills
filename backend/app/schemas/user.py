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
    created_at: datetime

    model_config = {"from_attributes": True}


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
        created_at=user.created_at,
    )
