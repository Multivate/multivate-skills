from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.payment import PaymentStatus


class PaymentOut(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID | None
    amount_cents: int
    currency: str
    status: PaymentStatus
    external_ref: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    course_slug: str = Field(min_length=1, max_length=128)
    amount_cents: int = Field(ge=0)
    currency: str = Field(default="NGN", min_length=3, max_length=3)
