from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    course_slug: str = Field(..., min_length=1, max_length=128)
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=4000)


class ReviewOut(BaseModel):
    id: UUID
    course_slug: str
    course_title: str
    reviewer_name: str
    reviewer_email: str
    rating: int
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": False}


class PublicReviewOut(BaseModel):
    id: UUID
    course_slug: str
    course_title: str
    reviewer_display_name: str
    rating: int
    comment: str
    created_at: datetime
