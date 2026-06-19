from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enum_column import value_string_enum


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    AWAITING_REVIEW = "awaiting_review"
    PAID = "paid"
    COMPLETED = "completed"  # legacy instant checkout
    FAILED = "failed"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="NGN")
    status: Mapped[PaymentStatus] = mapped_column(
        value_string_enum(PaymentStatus, length=16),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    external_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(32), unique=True, index=True, nullable=True)
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(128), unique=True, index=True, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(32), nullable=False, default="bank_transfer")
    enrollment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("enrollments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    verification_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    coupon_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    discount_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("discount_codes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    original_amount_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    discount_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
