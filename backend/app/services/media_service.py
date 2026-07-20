from __future__ import annotations

import logging
import mimetypes
import uuid
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.media_file import MediaFile

logger = logging.getLogger(__name__)
_settings = get_settings()

# ---------------------------------------------------------------------------
# Allowed MIME type sets (parsed once from settings)
# ---------------------------------------------------------------------------

def _parse_types(csv: str) -> set[str]:
    return {t.strip().lower() for t in csv.split(",") if t.strip()}


_ALLOWED_IMAGES = _parse_types(_settings.allowed_image_types)
_ALLOWED_DOCS = _parse_types(_settings.allowed_document_types)
_ALLOWED_VIDEOS = _parse_types(_settings.allowed_video_types)
_ALL_ALLOWED = _ALLOWED_IMAGES | _ALLOWED_DOCS | _ALLOWED_VIDEOS

# Dangerous executable signatures — reject these regardless of reported MIME
_EXEC_MAGIC: list[bytes] = [
    b"MZ",            # Windows PE / DLL
    b"\x7fELF",       # Linux ELF
    b"#!/",           # shell script shebang
    b"#!",            # generic shebang
    b"\xca\xfe\xba\xbe",  # macOS Mach-O fat binary
    b"\xfe\xed\xfa\xce",  # Mach-O 32-bit
    b"\xfe\xed\xfa\xcf",  # Mach-O 64-bit
]


# ---------------------------------------------------------------------------
# Folder → allowed MIME mapping
# ---------------------------------------------------------------------------

FOLDER_TYPES: dict[str, set[str]] = {
    "avatars": _ALLOWED_IMAGES,
    "mentors": _ALLOWED_IMAGES,
    "courses": _ALLOWED_IMAGES | _ALLOWED_DOCS | _ALLOWED_VIDEOS,
    "lessons": _ALLOWED_DOCS | _ALLOWED_VIDEOS,
    "resources": _ALLOWED_DOCS,
    "general": _ALL_ALLOWED,
}

FOLDER_MAX_BYTES: dict[str, int] = {
    "avatars": 3 * 1024 * 1024,       # 3 MB
    "mentors": 4 * 1024 * 1024,       # 4 MB
    "courses": 6 * 1024 * 1024,       # 6 MB thumbnails; video handled separately
    "lessons": 512 * 1024 * 1024,     # 512 MB (video)
    "resources": 40 * 1024 * 1024,    # 40 MB
    "general": _settings.max_upload_size,
}


# ---------------------------------------------------------------------------
# Disk helpers
# ---------------------------------------------------------------------------

def _upload_root() -> Path:
    """Resolve and ensure the upload root directory exists."""
    backend_dir = Path(__file__).resolve().parents[2]
    root = backend_dir / _settings.upload_root
    root.mkdir(parents=True, exist_ok=True)
    return root


def _build_public_url(relative_path: str) -> str:
    base = _settings.public_upload_url.rstrip("/")
    return f"{base}/{relative_path}"


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _resolve_content_type(file: UploadFile) -> str:
    ct = (file.content_type or "application/octet-stream").split(";")[0].strip().lower()
    if ct == "application/octet-stream" and file.filename:
        guessed, _ = mimetypes.guess_type(file.filename)
        if guessed:
            ct = guessed.lower()
    return ct


def _check_exec_signature(data: bytes) -> None:
    for sig in _EXEC_MAGIC:
        if data[:len(sig)] == sig:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Executable file upload is not permitted.",
            )


def _extension_for(mime: str, filename: str | None) -> str:
    ext_map: dict[str, str] = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
        "application/pdf": "pdf",
        "application/zip": "zip",
        "application/x-zip-compressed": "zip",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
        "application/vnd.ms-powerpoint": "ppt",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/msword": "doc",
        "text/plain": "txt",
        "text/x-python": "py",
        "application/json": "json",
    }
    if mime in ext_map:
        return ext_map[mime]
    if filename:
        suffix = Path(filename).suffix.lstrip(".")
        if suffix:
            return suffix[:8]
    return "bin"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def upload_file(
    db: Session,
    *,
    file: UploadFile,
    folder: str,
    uploaded_by: UUID | None,
    subfolder: str | None = None,
) -> MediaFile:
    """
    Validate, store and record a media file upload.

    Parameters
    ----------
    db:           Active SQLAlchemy session (caller must commit).
    file:         The FastAPI UploadFile from the request.
    folder:       Logical bucket (see FOLDER_TYPES). Controls allowed types & size limit.
    uploaded_by:  User UUID of the uploader (nullable for anonymous/system uploads).
    subfolder:    Optional sub-path within the folder (e.g., a course or lesson UUID).
    """
    if folder not in FOLDER_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown upload folder '{folder}'. Valid values: {sorted(FOLDER_TYPES)}.",
        )

    allowed = FOLDER_TYPES[folder]
    max_bytes = FOLDER_MAX_BYTES[folder]
    content_type = _resolve_content_type(file)

    if content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type '{content_type}' is not allowed in folder '{folder}'.",
        )

    data = await file.read()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    if len(data) > max_bytes:
        mb = max_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {mb} MB limit for folder '{folder}'.",
        )

    _check_exec_signature(data)

    ext = _extension_for(content_type, file.filename)
    file_uuid = uuid.uuid4()
    stored_filename = f"{file_uuid}.{ext}"

    # Build relative path:  <folder>[/<subfolder>]/<uuid>.<ext>
    parts = [folder]
    if subfolder:
        parts.append(subfolder)
    parts.append(stored_filename)
    relative_path = "/".join(parts)

    dest = _upload_root() / Path(relative_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)

    public_url = _build_public_url(relative_path)
    original_filename = (file.filename or stored_filename)[:255]

    media = MediaFile(
        id=file_uuid,
        original_filename=original_filename,
        stored_filename=stored_filename,
        mime_type=content_type,
        extension=ext,
        size_bytes=len(data),
        folder=folder,
        relative_path=relative_path,
        public_url=public_url,
        uploaded_by=uploaded_by,
    )
    db.add(media)
    db.flush()  # get PK without committing so callers can batch

    logger.info(
        "media upload folder=%s path=%s bytes=%s uploader=%s",
        folder, relative_path, len(data), uploaded_by,
    )
    return media


def get_media_file(db: Session, file_id: UUID) -> MediaFile:
    """Fetch a non-deleted MediaFile or raise 404."""
    media = db.get(MediaFile, file_id)
    if not media or media.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found.")
    return media


def list_media_files(
    db: Session,
    *,
    folder: str | None = None,
    uploaded_by: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MediaFile]:
    """List non-deleted media files with optional filtering."""
    stmt = select(MediaFile).where(MediaFile.deleted_at.is_(None))
    if folder:
        stmt = stmt.where(MediaFile.folder == folder)
    if uploaded_by:
        stmt = stmt.where(MediaFile.uploaded_by == uploaded_by)
    stmt = stmt.order_by(MediaFile.created_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(stmt).all())


def delete_media_file(
    db: Session,
    file_id: UUID,
    *,
    requesting_user_id: UUID,
    is_admin: bool = False,
) -> None:
    """
    Soft-delete a MediaFile record and remove the underlying file from disk.

    Only the uploader or an admin may delete a file.
    """
    media = get_media_file(db, file_id)

    if not is_admin and media.uploaded_by != requesting_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this file.",
        )

    # Remove from disk (best-effort — do not abort if the file is already gone)
    disk_path = _upload_root() / Path(media.relative_path)
    try:
        if disk_path.is_file():
            disk_path.unlink()
    except OSError as exc:
        logger.warning("Could not remove upload from disk path=%s: %s", disk_path, exc)

    media.deleted_at = datetime.now(timezone.utc)
    db.add(media)
    db.flush()

    logger.info(
        "media soft-deleted id=%s path=%s by user=%s",
        file_id, media.relative_path, requesting_user_id,
    )
