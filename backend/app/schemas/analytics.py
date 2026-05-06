from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.payment import PaymentStatus
from app.schemas.user import UserPublic


class AdminTotals(BaseModel):
    total_users: int
    total_courses: int
    total_enrollments: int
    revenue_completed_cents: int
    payments_pending_count: int


class TopCourseRow(BaseModel):
    slug: str
    title: str
    image_url: str
    enrollment_count: int


class RecentEnrollmentRow(BaseModel):
    user_name: str
    user_email: str
    course_title: str
    course_slug: str
    created_at: datetime


class RecentPaymentRow(BaseModel):
    id: UUID
    amount_cents: int
    currency: str
    status: PaymentStatus
    created_at: datetime
    user_email: str
    course_slug: str | None
    course_title: str | None


class AdminDashboardOut(BaseModel):
    totals: AdminTotals
    top_courses: list[TopCourseRow]
    recent_users: list[UserPublic]
    recent_enrollments: list[RecentEnrollmentRow]
    recent_payments: list[RecentPaymentRow]


class InstructorTotals(BaseModel):
    total_courses: int
    total_enrollments: int
    unique_learners: int
    revenue_completed_cents: int


class InstructorCourseRow(BaseModel):
    slug: str
    title: str
    image_url: str
    lessons_count: int
    enrollment_count: int


class InstructorDashboardOut(BaseModel):
    totals: InstructorTotals
    courses: list[InstructorCourseRow]


class InstructorStudentRow(BaseModel):
    user_id: UUID
    user_name: str
    user_email: str
    course_slug: str
    course_title: str
    enrolled_at: datetime


class PaymentAdminRow(BaseModel):
    id: UUID
    amount_cents: int
    currency: str
    status: PaymentStatus
    created_at: datetime
    user_email: str
    course_slug: str | None
    course_title: str | None

