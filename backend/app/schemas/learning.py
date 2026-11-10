from datetime import datetime
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
    discount_percent: int = 0
    discount_expires_at: datetime | None = None
    sale_price_cents: int | None = None


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
    visit_dates: list[str] = Field(default_factory=list)


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
    discount_percent: int = 0
    discount_expires_at: datetime | None = None
    sale_price_cents: int | None = None
    status: str = "draft"
    promo_video_url: str | None = None
    match_score: float = 0
    match_reasons: list[str] = Field(default_factory=list)


class LearningPathStepOut(BaseModel):
    order: int
    track: str
    role: str
    reason: str
    course: RecommendedCourseOut


class StudentPortalCourseOut(BaseModel):
    slug: str
    title: str
    progress_pct: int
    status: str


class StudentPortalPaymentOut(BaseModel):
    status: str
    amount_cents: int
    currency: str
    course_title: str | None = None
    payment_reference: str | None = None


class StudentPortalOut(BaseModel):
    student_code: str
    name: str
    email: str
    study_mode: str
    campus_location: str | None = None
    cohort_name: str | None = None
    goal_code: str
    topic: str
    german_level: str
    weekly_hours: str
    enrolled_count: int
    outstanding_payments: int
    courses: list[StudentPortalCourseOut] = Field(default_factory=list)
    payments: list[StudentPortalPaymentOut] = Field(default_factory=list)
    visits_this_week: int = 0
    visit_goal: int = 0
    minutes_this_week: int = 0
    minutes_goal: int = 0
    visited_today: bool = False


class LearningPathOut(BaseModel):
    goal_code: str
    topic: str
    german_level: str
    instruction_locale: str
    weekly_hours: str
    session_minutes: int
    week_minutes: int
    week_days: int
    summary: str
    has_catalog: bool = False
    steps: list[LearningPathStepOut] = Field(default_factory=list)
