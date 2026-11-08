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
    duration_minutes: int = 0
    weeks_total: int = 1
    current_week: int = 1
    current_week_title: str = "Week 1"
    current_week_lessons: int = 0
    current_week_done: int = 0


class WeeklyCourseTargetIn(BaseModel):
    weekly_course_target: int = Field(ge=1, le=8)


class WeeklyCourseTargetOut(BaseModel):
    weekly_course_target: int


class LearningVisitIn(BaseModel):
    local_date: str = Field(min_length=10, max_length=10)


class LearningHabitsPatch(BaseModel):
    reminder_days: list[int] | None = None
    reminder_time: str | None = Field(default=None, max_length=5)
    reminder_minutes: int | None = Field(default=None, ge=15, le=180)
    reminder_dismissed: bool | None = None


class LibraryCourseOut(BaseModel):
    slug: str
    title: str
    image_url: str
    instructor_name: str | None = None
    price_cents: int = 0
    currency: str = "NGN"
    is_free: bool = False


class LibraryCourseIn(BaseModel):
    course_slug: str = Field(min_length=1, max_length=128)


class LearningListCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class LearningListOut(BaseModel):
    id: UUID
    title: str
    courses: list[LibraryCourseOut]


class LearningHabitsOut(BaseModel):
    local_date: str
    week_start: str
    week_end: str
    streak_weeks: int
    visits_this_week: int
    visit_goal: int
    visited_today: bool
    minutes_this_week: int
    minutes_goal: int
    reminder_days: list[int]
    reminder_time: str | None
    reminder_dismissed: bool
    reminder_enabled: bool


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
