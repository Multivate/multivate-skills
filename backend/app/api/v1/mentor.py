from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.mentor import (
    MentorConversationOut,
    MentorMessageIn,
    MentorMessageOut,
    MentorProfileSelfOut,
    MentorProfileSelfUpdateIn,
)
from app.services import mentor_service

router = APIRouter(prefix="/mentor", tags=["mentor"])


@router.get("/profile", response_model=MentorProfileSelfOut)
def read_self_profile(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.MENTOR))],
) -> MentorProfileSelfOut:
    return mentor_service.get_or_create_self_profile(db, user)


@router.patch("/profile", response_model=MentorProfileSelfOut)
def update_self_profile(
    body: MentorProfileSelfUpdateIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.MENTOR))],
) -> MentorProfileSelfOut:
    return mentor_service.update_self_profile(db, user, body)


@router.post("/profile/submit", response_model=MentorProfileSelfOut)
def submit_self_profile(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.MENTOR))],
) -> MentorProfileSelfOut:
    return mentor_service.submit_self_profile(db, user)


@router.post("/profile/photo", response_model=MentorProfileSelfOut)
async def upload_self_photo(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.MENTOR))],
    file: UploadFile = File(...),
) -> MentorProfileSelfOut:
    return await mentor_service.upload_self_photo(db, user, file)


@router.get("/conversations", response_model=list[MentorConversationOut])
def mentor_inbox(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.MENTOR))],
) -> list[MentorConversationOut]:
    return mentor_service.list_mentor_inbox(db, user)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MentorMessageOut])
def mentor_list_messages(
    conversation_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.MENTOR))],
) -> list[MentorMessageOut]:
    return mentor_service.list_conversation_messages(db, conversation_id, user=user)


@router.post("/conversations/{conversation_id}/messages", response_model=MentorMessageOut)
def mentor_reply(
    conversation_id: UUID,
    body: MentorMessageIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.MENTOR))],
) -> MentorMessageOut:
    return mentor_service.post_message(db, conversation_id, body.message, user=user)
