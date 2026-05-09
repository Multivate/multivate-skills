from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InstructorTeachingProfile(Base):
    """Instructor onboarding questionnaire (one row per instructor)."""

    __tablename__ = "instructor_teaching_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    expertise_areas: Mapped[str] = mapped_column(Text, nullable=False)
    teaching_bio: Mapped[str] = mapped_column(Text, nullable=False)
    subjects_taught: Mapped[str] = mapped_column(Text, nullable=False)
    years_experience: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    teaching_formats: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    credentials_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    professional_links: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
