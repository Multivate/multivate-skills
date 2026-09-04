from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.course_status import AudioSource
from app.models.enum_column import value_string_enum


class AudioPhrase(Base):
    """One source/target phrase pair for an audio (phrasebook) course."""

    __tablename__ = "audio_phrases"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("course_sections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source_text: Mapped[str] = mapped_column(String(512), nullable=False)
    target_text: Mapped[str] = mapped_column(String(512), nullable=False)
    audio_source: Mapped[Optional[AudioSource]] = mapped_column(
        value_string_enum(AudioSource),
        nullable=True,
    )
    audio_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
