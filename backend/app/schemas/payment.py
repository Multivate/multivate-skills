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
    amount_cents: int | None = Field(default=None, description="Ignored. Server sets the price.")
    currency: str | None = Field(default=None, max_length=3, description="Ignored. Server sets the currency.")
    cart_slugs: list[str] = Field(default_factory=list, max_length=40)
