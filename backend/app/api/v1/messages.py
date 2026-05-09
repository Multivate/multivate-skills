from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut
from app.services import message_service

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/me", response_model=list[MessageOut])
def inbox(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[MessageOut]:
    return message_service.list_inbox(db, user.id)


@router.post("", response_model=MessageOut, status_code=201)
def send(
    body: MessageCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> MessageOut:
    return message_service.send_message(db, user.id, body)


@router.patch("/{message_id}/read", response_model=MessageOut)
def mark_message_read(
    message_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> MessageOut:
    return message_service.mark_read(db, user.id, message_id)
