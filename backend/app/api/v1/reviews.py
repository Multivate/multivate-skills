from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.review import PublicReviewOut, ReviewCreate, ReviewOut
from app.services import review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/public", response_model=list[PublicReviewOut])
def list_public_reviews(
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=24)] = 12,
) -> list[PublicReviewOut]:
    """Recent learner reviews with comments on published courses (homepage)."""
    return review_service.list_public_testimonials(db, limit=limit)


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
