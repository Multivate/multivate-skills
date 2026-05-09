from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut)
def create_or_update_review(
    body: ReviewCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ReviewOut:
    """Learners only: must be enrolled in the course."""
    return review_service.upsert_review(db, user.id, body)


@router.get("/instructor/me", response_model=list[ReviewOut])
def list_my_course_reviews(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.INSTRUCTOR))],
) -> list[ReviewOut]:
    """Reviews left by students on courses you instruct."""
    return review_service.list_instructor_reviews(db, user.id)
