from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.payment import PaymentStatus
from app.models.role import UserRole
from app.models.user import User
from app.schemas.analytics import AdminDashboardOut, PaymentAdminRow, RecentEnrollmentRow
from app.schemas.bank_transfer import AdminPaymentApproveIn, AdminPaymentRejectIn, PaymentVerifyOut, StudentPaymentOut
from app.schemas.discount import DiscountCodeCreateIn, DiscountCodeOut
from app.schemas.instructor_profile import InstructorTeachingProfileAdminRow
from app.schemas.review import ReviewOut
from app.schemas.studio import AdminCourseRejectIn, CourseStudioBasicsOut, StudioCourseListItem
from app.schemas.student_profile import StudentLearningProfileAdminRow
from app.schemas.user import UserPublic, user_public_from_orm
from app.services import analytics_service, bank_transfer_service, course_studio_service, discount_service, instructor_profile_service, learning_service, review_service

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
        db, admin, payment_id, body.transaction_reference
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
