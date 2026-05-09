from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.analytics import AdminDashboardOut, PaymentAdminRow, RecentEnrollmentRow
from app.schemas.instructor_profile import InstructorTeachingProfileAdminRow
from app.schemas.student_profile import StudentLearningProfileAdminRow
from app.schemas.user import UserPublic, user_public_from_orm
from app.services import analytics_service, instructor_profile_service, learning_service

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


@router.get("/payments", response_model=list[PaymentAdminRow])
def list_admin_payments(
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
