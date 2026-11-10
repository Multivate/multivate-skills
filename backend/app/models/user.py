from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enum_column import FlexibleStrEnum
from app.models.role import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(16), nullable=False, default="password")
    oauth_subject: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    role: Mapped[UserRole] = mapped_column(
        FlexibleStrEnum(UserRole, length=32),
        nullable=False,
        default=UserRole.STUDENT,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    authenticator_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    authenticator_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    student_code: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    learn_topic: Mapped[str | None] = mapped_column(String(64), nullable=True)
    learn_with: Mapped[str | None] = mapped_column(String(8), nullable=True)
    preferred_locale: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    profile_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    public_slug: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    public_headline: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    public_bio: Mapped[str] = mapped_column(String(4000), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
