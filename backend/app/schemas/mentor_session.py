from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.mentor_session import MentorSessionStatus, MentorSessionTier
from app.schemas.bank_transfer import BankTransferInstructions, RemitaCheckout, StudentPaymentOut


class MentorSessionTierOut(BaseModel):
    tier: MentorSessionTier
    label: str
    description: str
    amount_cents: int
    currency: str
    duration_minutes: int
    billed_hours: int


class MentorSessionStartIn(BaseModel):
    tier: MentorSessionTier
    mentor_slug: str | None = Field(default=None, max_length=128)
    course_slug: str | None = Field(default=None, max_length=128)
    preferred_time_note: str | None = Field(default=None, max_length=1000)
    billed_hours: int = Field(default=1, ge=1, le=8)


class MentorSessionBookingOut(BaseModel):
    id: UUID
    tier: MentorSessionTier
    status: MentorSessionStatus
    duration_minutes: int
    billed_hours: int
    amount_cents: int
    currency: str
    course_slug: str | None = None
    preferred_time_note: str | None = None
    scheduled_at: datetime | None = None
    meeting_url: str | None = None
    mentor_slug: str | None = None
    mentor_name: str | None = None
    created_at: datetime


class MentorSessionStartOut(BaseModel):
    booking: MentorSessionBookingOut
    student_code: str
    payment: StudentPaymentOut | None = None
    instructions: BankTransferInstructions | None = None
    remita: RemitaCheckout | None = None
    message: str
