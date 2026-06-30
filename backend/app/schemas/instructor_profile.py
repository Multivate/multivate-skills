from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class InstructorTeachingProfileRegistration(BaseModel):
    expertise_areas: str = Field(..., min_length=1, max_length=12000)
    teaching_bio: str | None = Field(None, max_length=12000)
    subjects_taught: str | None = Field(None, max_length=12000)
    years_experience: str = Field(..., min_length=1, max_length=32)
    teaching_formats: str = Field(..., min_length=1, max_length=255)
    credentials_notes: str | None = Field(None, max_length=12000)
    professional_links: str | None = Field(None, max_length=12000)


class InstructorTeachingProfileUpsert(BaseModel):
    expertise_areas: str | None = Field(None, max_length=12000)
    teaching_bio: str | None = Field(None, max_length=12000)
    subjects_taught: str | None = Field(None, max_length=12000)
    years_experience: str | None = Field(None, max_length=32)
    teaching_formats: str | None = Field(None, max_length=255)
    credentials_notes: str | None = Field(None, max_length=12000)
    professional_links: str | None = Field(None, max_length=12000)


class InstructorTeachingProfileOut(BaseModel):
    user_id: uuid.UUID
    expertise_areas: str
    teaching_bio: str
    subjects_taught: str
    years_experience: str | None
    teaching_formats: str | None
    credentials_notes: str | None
    professional_links: str | None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class InstructorTeachingProfileAdminRow(BaseModel):
    user_id: uuid.UUID
    user_name: str
    user_email: str
    expertise_areas: str
    teaching_bio: str
    subjects_taught: str
    years_experience: str | None
    teaching_formats: str | None
    credentials_notes: str | None
    professional_links: str | None
    updated_at: datetime
