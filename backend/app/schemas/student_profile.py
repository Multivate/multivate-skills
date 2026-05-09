from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class StudentLearningProfileOut(BaseModel):
    user_id: uuid.UUID
    education_level: str | None
    current_skills: str | None
    skills_to_learn: str | None
    learning_goals: str | None
    preferred_formats: str | None
    weekly_hours: str | None
    career_direction: str | None
    extra_notes: str | None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class StudentLearningProfileAdminRow(BaseModel):
    """Joined learner + questionnaire row for admin reporting."""

    user_id: uuid.UUID
    user_name: str
    user_email: str
    education_level: str | None
    current_skills: str | None
    skills_to_learn: str | None
    learning_goals: str | None
    preferred_formats: str | None
    weekly_hours: str | None
    career_direction: str | None
    extra_notes: str | None
    updated_at: datetime


class StudentLearningProfileRegistration(BaseModel):
    """Required fields for combined sign-up (must be completed before account is created)."""

    education_level: str = Field(..., min_length=1, max_length=64)
    current_skills: str | None = Field(None, max_length=12000)
    skills_to_learn: str = Field(..., min_length=1, max_length=12000)
    learning_goals: str = Field(..., min_length=1, max_length=12000)
    preferred_formats: str = Field(..., min_length=1, max_length=255)
    weekly_hours: str = Field(..., min_length=1, max_length=32)
    career_direction: str = Field(..., min_length=1, max_length=12000)
    extra_notes: str | None = Field(None, max_length=12000)


class StudentLearningProfileUpsert(BaseModel):
    education_level: str | None = Field(None, max_length=64)
    current_skills: str | None = Field(None, max_length=12000)
    skills_to_learn: str | None = Field(None, max_length=12000)
    learning_goals: str | None = Field(None, max_length=12000)
    preferred_formats: str | None = Field(None, max_length=255)
    weekly_hours: str | None = Field(None, max_length=32)
    career_direction: str | None = Field(None, max_length=12000)
    extra_notes: str | None = Field(None, max_length=12000)
