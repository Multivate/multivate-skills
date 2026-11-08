from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.course_audit_log import CourseAuditLog
from app.models.payment import PaymentStatus
from app.models.payment_audit_log import PaymentAuditLog
from app.models.role import UserRole
from app.models.user import User
from app.schemas.analytics import AdminDashboardOut, PaymentAdminRow, RecentEnrollmentRow
from app.schemas.bank_transfer import AdminPaymentApproveIn, AdminPaymentRejectIn, PaymentVerifyOut, StudentPaymentOut
from app.schemas.discount import DiscountCodeCreateIn, DiscountCodeOut
from app.schemas.instructor_profile import InstructorTeachingProfileAdminRow
from app.schemas.mentor import MentorAdminFeatureIn, MentorAdminRejectIn, MentorProfileAdminRow
from app.schemas.review import ReviewOut
from app.schemas.studio import AdminCourseRejectIn, CourseStudioBasicsOut, StudioCourseListItem
from app.schemas.student_profile import StudentLearningProfileAdminRow
from app.schemas.user import UserPublic, user_public_from_orm
from app.services import analytics_service, authenticator_service, bank_transfer_service, course_studio_service, discount_service, instructor_profile_service, learning_service, mentor_service, review_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardOut)
def read_admin_dashboard(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> AdminDashboardOut:
    return analytics_service.admin_dashboard(db)


@router.get("/enrollments", response_model=list[RecentEnrollmentRow])
def list_admin_enrollments(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    limit: int = Query(100, ge=1, le=500),
) -> list[RecentEnrollmentRow]:
    return analytics_service.admin_enrollments_list(db, limit=limit)


@router.get("/payments", response_model=list[StudentPaymentOut])
def list_admin_payments(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: PaymentStatus | None = Query(None, alias="status"),
    search: str | None = Query(None, max_length=128),
) -> list[StudentPaymentOut]:
    return bank_transfer_service.list_admin_payments(
        db, status_filter=status_filter, search=search, skip=skip, limit=limit
    )


@router.patch("/payments/{payment_id}/approve", response_model=PaymentVerifyOut)
def approve_payment(
    payment_id: UUID,
    body: AdminPaymentApproveIn,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> PaymentVerifyOut:
    return bank_transfer_service.admin_approve_payment(
        db, admin, payment_id, body.transaction_reference, body.amount_received_cents
    )


@router.patch("/payments/{payment_id}/reject", response_model=PaymentVerifyOut)
def reject_payment(
    payment_id: UUID,
    body: AdminPaymentRejectIn,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> PaymentVerifyOut:
    return bank_transfer_service.admin_reject_payment(db, admin, payment_id, body.reason)


@router.get("/payments/legacy", response_model=list[PaymentAdminRow])
def list_admin_payments_legacy(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> list[PaymentAdminRow]:
    return analytics_service.admin_payments_page(db, skip, limit)


@router.get("/student-learning-profiles", response_model=list[StudentLearningProfileAdminRow])
def list_student_learning_profiles(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    limit: int = Query(200, ge=1, le=500),
) -> list[StudentLearningProfileAdminRow]:
    """Questionnaire responses submitted by learners (joined to user name/email)."""
    return learning_service.list_student_profiles_for_admin(db, limit=limit)


@router.get("/instructor-teaching-profiles", response_model=list[InstructorTeachingProfileAdminRow])
def list_instructor_teaching_profiles(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    limit: int = Query(200, ge=1, le=500),
) -> list[InstructorTeachingProfileAdminRow]:
    """Instructor onboarding questionnaire (joined to user name/email)."""
    return instructor_profile_service.list_instructor_profiles_for_admin(db, limit=limit)


@router.get("/users", response_model=list[UserPublic])
def list_admin_users(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> list[UserPublic]:
    stmt = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    rows = list(db.scalars(stmt).unique().all())
    return [user_public_from_orm(u) for u in rows]


@router.get("/reviews", response_model=list[ReviewOut])
def list_admin_reviews(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    limit: int = Query(100, ge=1, le=500),
) -> list[ReviewOut]:
    return review_service.list_admin_reviews(db, limit=limit)


@router.get("/courses/pending", response_model=list[StudioCourseListItem])
def list_pending_courses(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> list[StudioCourseListItem]:
    return course_studio_service.admin_list_pending(db)


@router.post("/courses/{slug}/approve", response_model=CourseStudioBasicsOut)
def approve_course(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> CourseStudioBasicsOut:
    return course_studio_service.admin_approve_course(db, slug, admin)


@router.post("/courses/{slug}/reject", response_model=CourseStudioBasicsOut)
def reject_course(
    slug: str,
    body: AdminCourseRejectIn,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> CourseStudioBasicsOut:
    return course_studio_service.admin_reject_course(db, slug, body.reason, admin)


@router.get("/discount-codes", response_model=list[DiscountCodeOut])
def list_discount_codes(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    limit: int = Query(100, ge=1, le=200),
) -> list[DiscountCodeOut]:
    return discount_service.list_discount_codes(db, limit=limit)


@router.post("/discount-codes", response_model=DiscountCodeOut, status_code=status.HTTP_201_CREATED)
def create_discount_code(
    body: DiscountCodeCreateIn,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> DiscountCodeOut:
    return discount_service.create_discount_code(db, admin, body)


@router.patch("/discount-codes/{discount_id}/deactivate", response_model=DiscountCodeOut)
def deactivate_discount_code(
    discount_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> DiscountCodeOut:
    return discount_service.set_discount_active(db, discount_id, is_active=False)


@router.patch("/discount-codes/{discount_id}/activate", response_model=DiscountCodeOut)
def activate_discount_code(
    discount_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> DiscountCodeOut:
    return discount_service.set_discount_active(db, discount_id, is_active=True)


@router.get("/mentors", response_model=list[MentorProfileAdminRow])
def list_admin_mentors(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    limit: int = Query(200, ge=1, le=500),
) -> list[MentorProfileAdminRow]:
    return mentor_service.list_admin_mentors(db, limit=limit)


@router.post("/mentors/{mentor_id}/approve", response_model=MentorProfileAdminRow)
def approve_mentor_profile(
    mentor_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> MentorProfileAdminRow:
    return mentor_service.admin_approve(db, mentor_id)


@router.post("/mentors/{mentor_id}/reject", response_model=MentorProfileAdminRow)
def reject_mentor_profile(
    mentor_id: UUID,
    body: MentorAdminRejectIn,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> MentorProfileAdminRow:
    return mentor_service.admin_reject(db, mentor_id, body.reason)


@router.patch("/mentors/{mentor_id}/feature", response_model=MentorProfileAdminRow)
def feature_mentor_profile(
    mentor_id: UUID,
    body: MentorAdminFeatureIn,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> MentorProfileAdminRow:
    return mentor_service.admin_set_featured(db, mentor_id, body)


class SecurityStatusOut(BaseModel):
    email_code_enabled: bool
    authenticator_enabled: bool


class AuthenticatorStartOut(BaseModel):
    secret: str
    otpauth_uri: str


class AuthenticatorConfirmIn(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)


class SystemLogOut(BaseModel):
    id: str
    source: str
    action: str
    detail: str | None = None
    actor_name: str | None = None
    created_at: datetime


@router.get("/security", response_model=SecurityStatusOut)
def read_admin_security(
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> SecurityStatusOut:
    return SecurityStatusOut(**authenticator_service.security_status(admin))


@router.post("/security/authenticator/start", response_model=AuthenticatorStartOut)
def start_admin_authenticator(
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> AuthenticatorStartOut:
    return AuthenticatorStartOut(**authenticator_service.start_authenticator(db, admin))


@router.post("/security/authenticator/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_admin_authenticator(
    body: AuthenticatorConfirmIn,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> None:
    authenticator_service.confirm_authenticator(db, admin, body.code)


@router.get("/system-logs", response_model=list[SystemLogOut])
def list_system_logs(
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    limit: int = Query(100, ge=1, le=200),
) -> list[SystemLogOut]:
    authenticator_service.require_authenticator(admin)
    course_rows = db.execute(
        select(CourseAuditLog, User.name)
        .outerjoin(User, User.id == CourseAuditLog.actor_user_id)
        .order_by(CourseAuditLog.created_at.desc())
        .limit(limit)
    ).all()
    payment_rows = db.execute(
        select(PaymentAuditLog, User.name)
        .outerjoin(User, User.id == PaymentAuditLog.actor_user_id)
        .order_by(PaymentAuditLog.created_at.desc())
        .limit(limit)
    ).all()
    rows: list[SystemLogOut] = []
    for log, actor_name in course_rows:
        rows.append(
            SystemLogOut(
                id=str(log.id),
                source="course",
                action=log.action,
                detail=log.detail,
                actor_name=actor_name,
                created_at=log.created_at,
            )
        )
    for log, actor_name in payment_rows:
        rows.append(
            SystemLogOut(
                id=str(log.id),
                source="payment",
                action=log.action,
                detail=log.detail,
                actor_name=actor_name,
                created_at=log.created_at,
            )
        )
    rows.sort(key=lambda row: row.created_at, reverse=True)
    return rows[:limit]
