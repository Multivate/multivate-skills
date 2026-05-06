from uuid import UUID

from pydantic import BaseModel, Field


class CourseOut(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str
    image_url: str
    lessons_count: int
    instructor_id: UUID | None = None

    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=128, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1, max_length=512)
    image_url: str = Field(min_length=1)
    lessons_count: int = Field(default=0, ge=0)
    instructor_id: UUID | None = None


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=512)
    image_url: str | None = Field(default=None, min_length=1)
    lessons_count: int | None = Field(default=None, ge=0)
    instructor_id: UUID | None = None
