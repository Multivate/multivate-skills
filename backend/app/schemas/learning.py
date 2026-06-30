from pydantic import BaseModel, Field, model_validator
from uuid import UUID


class MyCourseItem(BaseModel):
    slug: str
    title: str
    description: str
    image_url: str
    image_alt: str
    lessons: int
    lesson_done: int
    progress_pct: int
    status: str = Field(description="In Progress | Not Started | Completed")
    instructor_name: str | None = None
    instructor_email: str | None = None


class ProgressUpdate(BaseModel):
    lesson_done: int | None = Field(default=None, ge=0)
    progress_pct: int | None = Field(default=None, ge=0, le=100)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "ProgressUpdate":
        if self.lesson_done is None and self.progress_pct is None:
            raise ValueError("Provide lesson_done and/or progress_pct")
        return self


class RecommendedCourseOut(BaseModel):
    id: UUID
    slug: str
    title: str
    subtitle: str | None = None
    description: str
    learning_objectives: str | None = None
    image_url: str
    lessons_count: int
    instructor_id: UUID | None = None
    category: str = "general"
    level: str = "beginner"
    language: str = "en"
    duration_minutes: int = 0
    tags: str | None = None
    price_cents: int = 0
    currency: str = "NGN"
    is_free: bool = False
    status: str = "draft"
    promo_video_url: str | None = None
    match_score: float = 0
    match_reasons: list[str] = Field(default_factory=list)
