from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enrollment_status import EnrollmentStatus
from app.models.payment import PaymentStatus


class BankTransferInstructions(BaseModel):
    bank_name: str
    account_name: str
    account_number: str
    amount_cents: int
    currency: str
    payment_reference: str
    student_code: str
    course_title: str
    course_slug: str
    original_amount_cents: int | None = None
    discount_cents: int = 0
    coupon_code: str | None = None


class RemitaCheckout(BaseModel):
    rrr: str
    merchant_id: str
    payment_hash: str
    payment_gateway_url: str
    response_url: str
    amount_cents: int
    currency: str
    payment_reference: str


class StudentPaymentOut(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str | None = None
    user_email: str | None = None
    course_id: UUID | None
    course_slug: str | None = None
    course_title: str | None = None
    student_code: str | None = None
    payment_reference: str | None = None
    transaction_reference: str | None = None
    amount_cents: int
    currency: str
    status: PaymentStatus
    payment_method: str
    coupon_code: str | None = None
    original_amount_cents: int | None = None
    discount_cents: int = 0
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class EnrollmentStartOut(BaseModel):
    enrollment_status: EnrollmentStatus
    student_code: str
    payment: StudentPaymentOut | None = None
    instructions: BankTransferInstructions | None = None
    remita: RemitaCheckout | None = None
    message: str


class EnrollmentStartIn(BaseModel):
    course_slug: str = Field(min_length=1, max_length=128)
    coupon_code: str | None = Field(default=None, max_length=32)


class PaymentVerifyIn(BaseModel):
    payment_reference: str = Field(min_length=6, max_length=32)
    transaction_reference: str = Field(min_length=4, max_length=128)


class PaymentVerifyOut(BaseModel):
    success: bool
    payment: StudentPaymentOut
    message: str


class PaymentStatusOut(BaseModel):
    payment: StudentPaymentOut
    instructions: BankTransferInstructions | None = None
    remita: RemitaCheckout | None = None


class AdminPaymentApproveIn(BaseModel):
    transaction_reference: str | None = Field(default=None, max_length=128)


class AdminPaymentRejectIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
