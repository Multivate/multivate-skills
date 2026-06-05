from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.course_status import CourseLevel, CourseStatus
from app.models.enum_column import value_string_enum


class Course(Base):
    """Catalog row — instructor-authored via Course Studio."""

    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    learning_objectives: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    lessons_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=990000)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="NGN")
    is_free: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="general")
    level: Mapped[CourseLevel] = mapped_column(
        value_string_enum(CourseLevel),
        nullable=False,
        default=CourseLevel.BEGINNER,
    )
    language: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tags: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    promo_video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[CourseStatus] = mapped_column(
        value_string_enum(CourseStatus),
        nullable=False,
        default=CourseStatus.DRAFT,
        index=True,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instructor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
