from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.payment import PaymentStatus
from app.models.role import UserRole
from app.models.user import User
from app.schemas.bank_transfer import (
    AdminPaymentApproveIn,
    EnrollmentStartIn,
    EnrollmentStartOut,
    PaymentStatusOut,
    PaymentVerifyIn,
    PaymentVerifyOut,
    StudentPaymentOut,
)
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services import bank_transfer_service, payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/me", response_model=list[StudentPaymentOut])
def list_my_payments(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[StudentPaymentOut]:
    return bank_transfer_service.list_student_payments(db, user.id)


@router.get("/status/{payment_reference}", response_model=PaymentStatusOut)
def get_payment_status(
    payment_reference: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PaymentStatusOut:
    return bank_transfer_service.get_payment_status(db, user, payment_reference)


@router.post("/verify", response_model=PaymentVerifyOut)
def verify_payment(
    payload: PaymentVerifyIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PaymentVerifyOut:
    return bank_transfer_service.verify_payment(db, user, payload)


@router.post("/remita/callback")
async def remita_callback(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> PlainTextResponse:
    raw = (await request.body()).decode("utf-8", errors="replace")
    result = bank_transfer_service.handle_remita_callback(db, raw)
    return PlainTextResponse(result)


@router.post("/remita/refresh/{payment_reference}", response_model=PaymentVerifyOut)
def refresh_remita_payment(
    payment_reference: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PaymentVerifyOut:
    return bank_transfer_service.refresh_remita_payment(db, user, payment_reference)


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PaymentOut:
    return payment_service.create_payment(db, user.id, payload)


