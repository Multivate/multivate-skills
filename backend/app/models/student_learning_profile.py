from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StudentLearningProfile(Base):
    """Optional learner questionnaire: skills, goals, preferences (one row per student)."""

    __tablename__ = "student_learning_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    education_level: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    current_skills: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    skills_to_learn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    learning_goals: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preferred_formats: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    weekly_hours: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    career_direction: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
