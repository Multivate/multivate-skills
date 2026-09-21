from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.mentor_session import (
    MentorSessionBookingOut,
    MentorSessionStartIn,
    MentorSessionStartOut,
    MentorSessionTierOut,
)
from app.services import mentor_session_service

router = APIRouter(prefix="/mentor-sessions", tags=["mentor-sessions"])


@router.get("/tiers", response_model=list[MentorSessionTierOut])
def get_tiers() -> list[MentorSessionTierOut]:
    return mentor_session_service.list_session_tiers()


@router.post("/start", response_model=MentorSessionStartOut, status_code=status.HTTP_201_CREATED)
def start_session(
    body: MentorSessionStartIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> MentorSessionStartOut:
    return mentor_session_service.start_session(db, user, body)


@router.get("/me", response_model=list[MentorSessionBookingOut])
def my_sessions(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[MentorSessionBookingOut]:
    return mentor_session_service.list_my_sessions(db, user)
