from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enum_column import value_string_enum


class MentorSessionTier(str, enum.Enum):
    STANDARD = "standard"
    PROFESSIONAL = "professional"
    NATIVE_PROFESSIONAL = "native_professional"


class MentorSessionStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# One billed hour = 45 minutes of live instruction
SESSION_DURATION_MINUTES = 45


class MentorSessionBooking(Base):
    __tablename__ = "mentor_session_bookings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mentor_profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("mentor_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tier: Mapped[MentorSessionTier] = mapped_column(
        value_string_enum(MentorSessionTier, length=32),
        nullable=False,
        index=True,
    )
    status: Mapped[MentorSessionStatus] = mapped_column(
        value_string_enum(MentorSessionStatus, length=32),
        nullable=False,
        default=MentorSessionStatus.PENDING_PAYMENT,
        index=True,
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=SESSION_DURATION_MINUTES)
    billed_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="NGN")
    course_slug: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    preferred_time_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    meeting_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
