from uuid import UUID

from pydantic import BaseModel, Field


class LessonOut(BaseModel):
    id: UUID
    course_id: UUID
    position: int
    title: str
    body: str | None
    duration_minutes: int

    model_config = {"from_attributes": True}


class LessonCreate(BaseModel):
    position: int | None = Field(default=None, ge=0)
    title: str = Field(min_length=1, max_length=255)
    body: str | None = None
    duration_minutes: int = Field(default=0, ge=0)


class LessonUpdate(BaseModel):
    position: int | None = Field(default=None, ge=0)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
