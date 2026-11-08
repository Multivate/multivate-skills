from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SupportTicketCreate(BaseModel):
    subject: str = Field(min_length=4, max_length=200)
    body: str = Field(min_length=10, max_length=4000)


class SupportTicketOut(BaseModel):
    id: UUID
    subject: str
    body: str
    status: str
    created_at: datetime
    updated_at: datetime
