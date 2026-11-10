from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ClassroomPostIn(BaseModel):
    space: str = Field(pattern="^(hub|community)$")
    channel: str = Field(default="general", max_length=32)
    title: str | None = Field(default=None, max_length=180)
    body: str = Field(default="", max_length=4000)
    image_url: str | None = Field(default=None, max_length=512)


class ClassroomCommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class ClassroomAuthorOut(BaseModel):
    id: UUID
    name: str
    avatar_url: str | None = None


class ClassroomCommentOut(BaseModel):
    id: UUID
    body: str
    created_at: datetime
    author: ClassroomAuthorOut


class ClassroomPostOut(BaseModel):
    id: UUID
    space: str
    channel: str
    title: str | None
    body: str
    image_url: str | None = None
    kind: str = "student"
    link_url: str | None = None
    link_label: str | None = None
    detail: str | None = None
    created_at: datetime
    author: ClassroomAuthorOut
    comment_count: int = 0
    comments: list[ClassroomCommentOut] = []


class ClassroomVoiceAction(BaseModel):
    room: str = Field(max_length=32)
    action: str = Field(pattern="^(join|leave|heartbeat)$")


class ClassroomVoiceMemberOut(BaseModel):
    id: UUID
    name: str
    room: str
