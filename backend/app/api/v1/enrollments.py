from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.enrollment import EnrollRequest
from app.schemas.bank_transfer import EnrollmentStartIn, EnrollmentStartOut
from app.services import bank_transfer_service, enrollment_service

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


@router.post("/start", response_model=EnrollmentStartOut, status_code=status.HTTP_201_CREATED)
def start_enrollment(
    body: EnrollmentStartIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> EnrollmentStartOut:
    """Begin paid enrollment: pending payment + bank transfer instructions."""
    return bank_transfer_service.start_enrollment(db, user, body.course_slug, body.coupon_code)


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def enroll(
    body: EnrollRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    enrollment_service.enroll_by_slug(db, user, body.course_slug)


@router.delete("/{course_slug}", status_code=status.HTTP_204_NO_CONTENT)
def unenroll(
    course_slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> None:
    enrollment_service.unenroll_by_slug(db, user, course_slug)
