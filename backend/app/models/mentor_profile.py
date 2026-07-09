from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enum_column import value_string_enum


class MentorApprovalStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    headline: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    city: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    origin_country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    years_in_germany: Mapped[int | None] = mapped_column(Integer, nullable=True)
    german_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    field_of_work: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expertise_areas: Mapped[str] = mapped_column(Text, nullable=False, default="")
    languages_spoken: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    career_tips: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[MentorApprovalStatus] = mapped_column(
        value_string_enum(MentorApprovalStatus),
        nullable=False,
        default=MentorApprovalStatus.DRAFT,
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
