from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.mentor import GuidanceChatIn, GuidanceChatOut
from app.services import guidance_ai_service

router = APIRouter(prefix="/guidance", tags=["guidance"])


@router.post("/chat", response_model=GuidanceChatOut)
async def guidance_chat(
    body: GuidanceChatIn,
    db: Annotated[Session, Depends(get_db)],
) -> GuidanceChatOut:
    return await guidance_ai_service.chat(db, body)
