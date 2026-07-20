from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MediaFileOut(BaseModel):
    """Public representation of an uploaded media file."""

    id: UUID
    original_filename: str
    mime_type: str
    extension: str
    size_bytes: int
    folder: str
    public_url: str
    uploaded_by: UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaUploadOut(BaseModel):
    """Response returned immediately after a successful upload."""

    file: MediaFileOut
    message: str = "Upload successful."
