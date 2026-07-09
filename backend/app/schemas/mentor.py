from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MentorProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    full_name: str
    headline: str
    bio: str
    photo_url: str | None
    city: str
    origin_country: str | None
    years_in_germany: int | None
    german_level: str | None
    field_of_work: str | None
    expertise_areas: str
    languages_spoken: str
    career_tips: str | None
    is_featured: bool
    people_helped_count: int = 0
    active_conversations_count: int = 0


class MentorProfileSelfOut(MentorProfilePublic):
    approval_status: str
    rejection_reason: str | None
    submitted_at: datetime | None
    approved_at: datetime | None
    updated_at: datetime


class MentorProfileAdminRow(MentorProfilePublic):
    approval_status: str
    rejection_reason: str | None
    submitted_at: datetime | None
    approved_at: datetime | None
    sort_order: int
    user_id: UUID
    linked_user_email: str | None = None
    created_at: datetime
    updated_at: datetime


class MentorProfileSelfUpdateIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    headline: str = Field(min_length=4, max_length=255)
    bio: str = Field(min_length=80, max_length=8000)
    city: str = Field(min_length=2, max_length=128)
    origin_country: str | None = Field(default=None, max_length=128)
    years_in_germany: int | None = Field(default=None, ge=0, le=80)
    german_level: str | None = Field(default=None, max_length=32)
    field_of_work: str | None = Field(default=None, max_length=128)
    expertise_areas: str = Field(min_length=4, max_length=2000)
    languages_spoken: str = Field(min_length=2, max_length=512)
    career_tips: str | None = Field(default=None, max_length=4000)


class MentorAdminRejectIn(BaseModel):
    reason: str = Field(min_length=4, max_length=2000)


class MentorAdminFeatureIn(BaseModel):
    is_featured: bool
    sort_order: int | None = Field(default=None, ge=0, le=9999)


class MentorConversationStartIn(BaseModel):
    visitor_name: str = Field(min_length=2, max_length=255)
    visitor_email: str | None = Field(default=None, max_length=320)
    message: str = Field(min_length=1, max_length=4000)


class MentorMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    guest_token: str | None = Field(default=None, max_length=64)


class MentorMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sender_kind: str
    body: str
    created_at: datetime


class MentorConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    mentor_id: UUID
    mentor_slug: str
    mentor_name: str
    visitor_name: str
    visitor_email: str | None
    status: str
    guest_token: str | None = None
    last_message_at: datetime
    created_at: datetime
    unread_count: int = 0
    last_message_preview: str | None = None


class MentorConversationStartOut(BaseModel):
    conversation_id: UUID
    guest_token: str
    mentor_name: str


class GuidanceChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class GuidanceChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(default=None, max_length=64)
    history: list[GuidanceChatMessage] = Field(default_factory=list, max_length=20)


class GuidanceChatOut(BaseModel):
    reply: str
    session_id: str
