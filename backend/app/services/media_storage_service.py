from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from jose import JWTError, jwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)
_settings = get_settings()

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_DOCS = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/x-python",
    "application/json",
}


@dataclass
class StoredFile:
    storage_key: str
    public_path: str
    filename: str
    content_type: str
    file_size_bytes: int
    duration_seconds: int = 0


def media_root() -> Path:
    backend_dir = Path(__file__).resolve().parents[2]
    root = backend_dir / _settings.media_root
    root.mkdir(parents=True, exist_ok=True)
    return root


def _safe_name(name: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9._-]+", "-", name).strip("-")
    return base[:180] or "file"


async def _read_upload(file: UploadFile, *, max_bytes: int, allowed: set[str]) -> tuple[bytes, str]:
    content_type = (file.content_type or "application/octet-stream").split(";")[0].strip().lower()
    if content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type: {content_type}",
        )
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")
    if not data:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Empty file")
    return data, content_type


async def save_user_avatar(user_id: UUID, file: UploadFile) -> StoredFile:
    data, content_type = await _read_upload(file, max_bytes=3 * 1024 * 1024, allowed=ALLOWED_IMAGE)
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[content_type]
    rel = f"avatars/{user_id}.{ext}"
    path = media_root() / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    logger.info("Saved user avatar user_id=%s bytes=%s", user_id, len(data))
    return StoredFile(
        storage_key=rel,
        public_path=f"/api/media/public/{rel}",
        filename=f"avatar.{ext}",
        content_type=content_type,
        file_size_bytes=len(data),
    )


async def save_course_thumbnail(course_id: UUID, file: UploadFile) -> StoredFile:
    data, content_type = await _read_upload(file, max_bytes=6 * 1024 * 1024, allowed=ALLOWED_IMAGE)
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[content_type]
    rel = f"courses/{course_id}/cover.{ext}"
    path = media_root() / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    logger.info("Saved course thumbnail course_id=%s bytes=%s path=%s", course_id, len(data), rel)
    return StoredFile(
        storage_key=rel,
    public_path=f"/api/media/public/{rel}",
        filename=f"cover.{ext}",
        content_type=content_type,
        file_size_bytes=len(data),
    )


async def save_lesson_video(course_id: UUID, lesson_id: UUID, file: UploadFile) -> StoredFile:
    data, content_type = await _read_upload(file, max_bytes=512 * 1024 * 1024, allowed=ALLOWED_VIDEO)
    ext = {"video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"}[content_type]
    rel = f"courses/{course_id}/lessons/{lesson_id}/video.{ext}"
    path = media_root() / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    logger.info("Saved lesson video lesson_id=%s bytes=%s", lesson_id, len(data))
    return StoredFile(
        storage_key=rel,
        public_path="",
        filename=f"video.{ext}",
        content_type=content_type,
        file_size_bytes=len(data),
        duration_seconds=0,
    )


async def save_lesson_resource(course_id: UUID, lesson_id: UUID, file: UploadFile) -> StoredFile:
    data, content_type = await _read_upload(file, max_bytes=40 * 1024 * 1024, allowed=ALLOWED_DOCS)
    fname = _safe_name(file.filename or "resource")
    rel = f"courses/{course_id}/lessons/{lesson_id}/resources/{uuid.uuid4().hex[:8]}-{fname}"
    path = media_root() / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    logger.info("Saved lesson resource lesson_id=%s file=%s bytes=%s", lesson_id, fname, len(data))
    return StoredFile(
        storage_key=rel,
        public_path="",
        filename=fname,
        content_type=content_type,
        file_size_bytes=len(data),
    )


def resolve_storage_path(storage_key: str) -> Path:
    root = media_root().resolve()
    target = (root / storage_key).resolve()
    if not str(target).startswith(str(root)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path")
    if not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return target


def create_stream_token(*, user_id: UUID, lesson_id: UUID) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=_settings.media_stream_token_minutes)
    payload = {"sub": str(user_id), "lesson_id": str(lesson_id), "typ": "video_stream", "exp": exp}
    return jwt.encode(payload, _settings.secret_key, algorithm=_settings.algorithm)


def decode_stream_token(token: str) -> tuple[UUID, UUID]:
    try:
        payload = jwt.decode(token, _settings.secret_key, algorithms=[_settings.algorithm])
        if payload.get("typ") != "video_stream":
            raise JWTError("wrong token type")
        return UUID(payload["sub"]), UUID(payload["lesson_id"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid stream token") from exc
