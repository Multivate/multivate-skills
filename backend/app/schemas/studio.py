from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.course_status import CourseFormat, CourseLevel, LessonType, VideoSource


class StudioCourseListItem(BaseModel):
    id: UUID
    slug: str
    title: str
    status: str
    format: str = "video"
    lessons_count: int
    image_url: str
    updated_at: datetime


class CoverImageUrlIn(BaseModel):
    image_url: str = Field(min_length=8, max_length=2048)


class CourseStudioBasicsIn(BaseModel):
    slug: str | None = Field(default=None, max_length=128)
    title: str = Field(min_length=1, max_length=255)
    subtitle: str | None = Field(default=None, max_length=512)
    description: str = Field(default="", max_length=8000)
    learning_objectives: str | None = None
    category: str = Field(default="general", max_length=64)
    format: CourseFormat = CourseFormat.VIDEO
    source_language: str = Field(default="en", max_length=8)
    target_language: str = Field(default="de", max_length=8)
    level: CourseLevel = CourseLevel.BEGINNER
    language: str = Field(default="en", max_length=8)
    duration_minutes: int = Field(default=0, ge=0)
    tags: str | None = Field(default=None, max_length=512)
    price_cents: int = Field(default=990000, ge=0)
    currency: str = Field(default="NGN", min_length=3, max_length=3)
    is_free: bool = False
    promo_video_url: str | None = None
    instructor_id: UUID | None = None


class CourseStudioBasicsOut(BaseModel):
    id: UUID
    slug: str
    title: str
    subtitle: str | None = None
    description: str
    learning_objectives: str | None = None
    category: str
    format: str = "video"
    source_language: str = "en"
    target_language: str = "de"
    level: str
    language: str
    duration_minutes: int
    tags: str | None = None
    price_cents: int
    currency: str
    is_free: bool
    promo_video_url: str | None = None
    instructor_id: UUID | None = None
    status: str
    image_url: str
    lessons_count: int
    rejection_reason: str | None = None


class SectionOut(BaseModel):
    id: UUID
    title: str
    position: int


class SectionCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    position: int | None = Field(default=None, ge=0)


class SectionUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    position: int | None = Field(default=None, ge=0)


class ReorderSectionsIn(BaseModel):
    section_ids: list[UUID]


class LessonResourceOut(BaseModel):
    id: UUID
    title: str
    file_type: str
    file_size_bytes: int


class LessonStudioIn(BaseModel):
    section_id: UUID | None = None
    position: int | None = Field(default=None, ge=0)
    title: str = Field(min_length=1, max_length=255)
    body: str | None = None
    lesson_type: LessonType = LessonType.VIDEO
    video_source: VideoSource | None = None
    video_url: str | None = None
    video_duration_seconds: int = Field(default=0, ge=0)
    quiz_json: str | None = None
    live_url: str | None = None
    is_previewable: bool = False
    duration_minutes: int = Field(default=0, ge=0)


class StudioLessonUpdateIn(BaseModel):
    section_id: UUID | None = None
    position: int | None = Field(default=None, ge=0)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = None
    lesson_type: LessonType | None = None
    video_source: VideoSource | None = None
    video_url: str | None = None
    video_duration_seconds: int | None = Field(default=None, ge=0)
    quiz_json: str | None = None
    live_url: str | None = None
    is_previewable: bool | None = None
    duration_minutes: int | None = Field(default=None, ge=0)


class LessonStudioOut(BaseModel):
    id: UUID
    section_id: UUID | None
    position: int
    title: str
    body: str | None
    lesson_type: str
    video_source: str | None
    video_url: str | None
    video_duration_seconds: int
    quiz_json: str | None
    live_url: str | None
    is_previewable: bool
    duration_minutes: int
    resources: list[LessonResourceOut] = Field(default_factory=list)


class LessonReorderIn(BaseModel):
    lesson_ids: list[UUID]


class CourseStudioDetailOut(CourseStudioBasicsOut):
    sections: list[SectionOut]
    lessons: list[LessonStudioOut]
    phrases: list["AudioPhraseOut"] = Field(default_factory=list)


class AudioPhraseIn(BaseModel):
    section_id: UUID | None = None
    position: int | None = Field(default=None, ge=0)
    source_text: str = Field(min_length=1, max_length=512)
    target_text: str = Field(min_length=1, max_length=512)
    audio_source: str | None = None
    audio_url: str | None = None
    audio_duration_seconds: int = Field(default=0, ge=0)


class AudioPhraseUpdateIn(BaseModel):
    section_id: UUID | None = None
    position: int | None = Field(default=None, ge=0)
    source_text: str | None = Field(default=None, min_length=1, max_length=512)
    target_text: str | None = Field(default=None, min_length=1, max_length=512)
    audio_source: str | None = None
    audio_url: str | None = None
    audio_duration_seconds: int | None = Field(default=None, ge=0)


class AudioPhraseOut(BaseModel):
    id: UUID
    section_id: UUID | None
    position: int
    source_text: str
    target_text: str
    audio_source: str | None
    audio_url: str | None
    audio_duration_seconds: int


class AudioPhraseReorderIn(BaseModel):
    phrase_ids: list[UUID]


class PlayerSectionOut(BaseModel):
    id: UUID
    title: str
    position: int


class PlayerPhraseOut(BaseModel):
    id: UUID
    section_id: UUID | None
    position: int
    source_text: str
    target_text: str
    audio_url: str | None
    stream_token: str | None = None
    audio_duration_seconds: int


class PlayerPhrasebookOut(BaseModel):
    course_slug: str
    course_title: str
    image_url: str
    format: str
    source_language: str
    target_language: str
    progress_pct: int
    sections: list[PlayerSectionOut]
    phrases: list[PlayerPhraseOut]


class CourseStudioAnalyticsOut(BaseModel):
    total_students: int
    completion_rate: int
    watch_time_hours: float
    revenue_cents: int
    currency: str
    average_rating: float
    most_watched_lessons: list[dict]
    recent_feedback: list[dict]


class AdminCourseRejectIn(BaseModel):
    reason: str = Field(default="Changes needed before we can publish.", max_length=2000)


class PlayerLessonOut(BaseModel):
    id: UUID
    section_id: UUID | None
    position: int
    title: str
    lesson_type: str
    duration_minutes: int
    is_previewable: bool
    completed: bool
    position_seconds: int


class PlayerCurriculumOut(BaseModel):
    course_slug: str
    course_title: str
    image_url: str
    progress_pct: int
    sections: list[PlayerSectionOut]
    lessons: list[PlayerLessonOut]


class PlayerProgressIn(BaseModel):
    lesson_id: UUID
    position_seconds: int = Field(default=0, ge=0)
    watch_time_seconds: int = Field(default=0, ge=0)
    completed: bool = False


class PlayerProgressOut(BaseModel):
    lesson_id: UUID
    position_seconds: int
    watch_time_seconds: int
    completed: bool


class StreamTokenOut(BaseModel):
    token: str
    expires_in_minutes: int
