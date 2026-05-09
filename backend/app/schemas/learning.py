from pydantic import BaseModel, Field, model_validator


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
