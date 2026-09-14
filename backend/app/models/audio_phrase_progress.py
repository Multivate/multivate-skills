from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AudioPhraseProgress(Base):
    """Per-user learned state for an audio phrasebook phrase."""

    __tablename__ = "audio_phrase_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "phrase_id", name="uq_audio_phrase_progress_user_phrase"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phrase_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("audio_phrases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    learned: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    learned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
