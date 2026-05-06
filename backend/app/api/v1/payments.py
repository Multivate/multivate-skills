from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/me", response_model=list[PaymentOut])
def list_my_payments(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[PaymentOut]:
    return payment_service.list_my_payments(db, user.id)


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> PaymentOut:
    return payment_service.create_payment(db, user.id, payload)
