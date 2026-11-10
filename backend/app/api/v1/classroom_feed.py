from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.classroom_feed import (
    ClassroomCommentIn,
    ClassroomCommentOut,
    ClassroomPostIn,
    ClassroomPostOut,
    ClassroomVoiceAction,
    ClassroomVoiceMemberOut,
)
from app.services import classroom_feed_service

router = APIRouter(prefix="/classroom", tags=["classroom"])


@router.get("/feed", response_model=list[ClassroomPostOut])
def list_feed(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    space: str = Query(default="hub"),
    channel: str | None = Query(default=None),
) -> list[ClassroomPostOut]:
    return classroom_feed_service.list_posts(db, space, channel, user)


@router.post("/feed", response_model=ClassroomPostOut, status_code=201)
def create_feed_post(
    payload: ClassroomPostIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ClassroomPostOut:
    return classroom_feed_service.create_post(db, user, payload)


@router.post("/feed/{post_id}/comments", response_model=ClassroomCommentOut, status_code=201)
def create_comment(
    post_id: UUID,
    payload: ClassroomCommentIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ClassroomCommentOut:
    return classroom_feed_service.add_comment(db, user, post_id, payload)


@router.get("/voice", response_model=list[ClassroomVoiceMemberOut])
def list_voice(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    room: str | None = Query(default=None),
) -> list[ClassroomVoiceMemberOut]:
    _ = user
    return classroom_feed_service.list_voice(db, room)


@router.post("/voice", response_model=list[ClassroomVoiceMemberOut])
def voice_action(
    payload: ClassroomVoiceAction,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[ClassroomVoiceMemberOut]:
    return classroom_feed_service.voice_action(db, user, payload.room, payload.action)
