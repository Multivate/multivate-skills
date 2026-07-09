from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_current_user
from app.models.user import User
from app.schemas.mentor import (
    MentorConversationStartIn,
    MentorConversationStartOut,
    MentorMessageIn,
    MentorMessageOut,
    MentorProfilePublic,
)
from app.services import mentor_service

router = APIRouter(prefix="/mentors", tags=["mentors"])


@router.get("", response_model=list[MentorProfilePublic])
def list_mentors(
    db: Annotated[Session, Depends(get_db)],
    featured: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
) -> list[MentorProfilePublic]:
    return mentor_service.list_public_mentors(db, featured_only=featured, limit=limit)


@router.get("/chat/{conversation_id}/messages", response_model=list[MentorMessageOut])
def list_messages(
    conversation_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    guest_token: str | None = Query(None),
    user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> list[MentorMessageOut]:
    return mentor_service.list_conversation_messages(
        db, conversation_id, guest_token=guest_token, user=user
    )


@router.post("/chat/{conversation_id}/messages", response_model=MentorMessageOut)
def send_message(
    conversation_id: UUID,
    body: MentorMessageIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> MentorMessageOut:
    return mentor_service.post_message(
        db,
        conversation_id,
        body.message,
        guest_token=body.guest_token,
        user=user,
    )


@router.get("/{slug}", response_model=MentorProfilePublic)
def get_mentor(slug: str, db: Annotated[Session, Depends(get_db)]) -> MentorProfilePublic:
    return mentor_service.get_public_mentor_by_slug(db, slug)


@router.post("/{slug}/conversations", response_model=MentorConversationStartOut)
def start_mentor_conversation(
    slug: str,
    body: MentorConversationStartIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> MentorConversationStartOut:
    mentor = mentor_service.get_mentor_row_by_slug(db, slug)
    return mentor_service.start_conversation(db, mentor, body, visitor_user=user)
