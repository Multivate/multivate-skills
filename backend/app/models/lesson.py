from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.course_status import LessonType, VideoSource
from app.models.enum_column import value_string_enum


class Lesson(Base):
    __tablename__ = "lessons"

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
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lesson_type: Mapped[LessonType] = mapped_column(
        value_string_enum(LessonType),
        nullable=False,
        default=LessonType.VIDEO,
    )
    video_source: Mapped[Optional[VideoSource]] = mapped_column(
        value_string_enum(VideoSource),
        nullable=True,
    )
    video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    video_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    video_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quiz_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    live_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_previewable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
