from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.user import UserPublic

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserPublic)
def read_me_alt(current: Annotated[User, Depends(get_current_user)]) -> User:
    """Alias for clients that prefer `/users/me`."""
    return current


@router.get("/", response_model=list[UserPublic])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    skip: int = 0,
    limit: int = 50,
) -> list[User]:
    if limit > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit too large")
    stmt = (
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    return list(db.execute(stmt).scalars().all())
