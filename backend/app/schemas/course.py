from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.course_status import CourseLevel, CourseStatus


class CourseOut(BaseModel):
    id: UUID
    slug: str
    title: str
    subtitle: str | None = None
    description: str
    learning_objectives: str | None = None
    image_url: str
    lessons_count: int
    modules_count: int = 0
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
    instructor_name: str | None = None
    average_rating: float | None = None
    rating_count: int = 0
    is_bestseller: bool = False

    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=128, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=8000)
    image_url: str = Field(default="")
    lessons_count: int = Field(default=0, ge=0)
    instructor_id: UUID | None = None


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=8000)
    image_url: str | None = None
    lessons_count: int | None = Field(default=None, ge=0)
    instructor_id: UUID | None = None
