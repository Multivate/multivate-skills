from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class MessageCreate(BaseModel):
    recipient_email: EmailStr
    subject: str = Field(..., min_length=1, max_length=255)
    body: str = Field(..., min_length=1, max_length=8000)


class MessageOut(BaseModel):
    id: UUID
    from_me: bool
    correspondent_name: str
    correspondent_email: str
    subject: str
    body: str
    read_at: datetime | None
    created_at: datetime
