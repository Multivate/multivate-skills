from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.discount_code import DiscountType


class DiscountCodeCreateIn(BaseModel):
    code: str | None = Field(default=None, max_length=32, description="Leave blank to auto-generate")
    label: str | None = Field(default=None, max_length=255)
    discount_type: DiscountType = DiscountType.PERCENT
    discount_value: int = Field(ge=1)
    course_id: UUID | None = None
    max_uses: int | None = Field(default=None, ge=1)
    max_uses_per_user: int = Field(default=1, ge=1, le=100)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def check_percent_range(self) -> "DiscountCodeCreateIn":
        if self.discount_type == DiscountType.PERCENT and not 1 <= self.discount_value <= 100:
            raise ValueError("Percent discount must be between 1 and 100")
        return self


class DiscountCodeOut(BaseModel):
    id: UUID
    code: str
    label: str | None = None
    discount_type: DiscountType
    discount_value: int
    course_id: UUID | None = None
    course_title: str | None = None
    max_uses: int | None = None
    used_count: int
    max_uses_per_user: int
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool
    created_at: datetime


class DiscountValidateIn(BaseModel):
    code: str = Field(min_length=3, max_length=32)
    course_slug: str = Field(min_length=1, max_length=128)


class DiscountValidateOut(BaseModel):
    valid: bool
    code: str
    discount_type: DiscountType
    discount_value: int
    original_amount_cents: int
    discount_cents: int
    final_amount_cents: int
    currency: str
    message: str
