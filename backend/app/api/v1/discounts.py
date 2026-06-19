from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.role import UserRole
from app.models.user import User
from app.schemas.discount import DiscountValidateIn, DiscountValidateOut
from app.services import course_service, discount_service
from app.services.bank_transfer_service import _course_price

router = APIRouter(prefix="/discount-codes", tags=["discount-codes"])


@router.post("/validate", response_model=DiscountValidateOut)
def validate_discount_code(
    body: DiscountValidateIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> DiscountValidateOut:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can use discount codes")
    course = course_service.get_course_or_404(db, body.course_slug)
    original_cents, currency = _course_price(course)
    if original_cents <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This course is free — no code needed.")
    return discount_service.validate_for_course(
        db,
        body.code,
        user,
        course,
        original_cents=original_cents,
        currency=currency,
    )
