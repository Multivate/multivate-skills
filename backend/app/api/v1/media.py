from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.role import UserRole
from app.models.user import User
from app.schemas.media import MediaFileOut, MediaUploadOut
from app.services import media_service

router = APIRouter(prefix="/media", tags=["media"])


@router.post(
    "/upload",
    response_model=MediaUploadOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a media file",
    description=(
        "Upload a file to the specified folder. "
        "Allowed folders: avatars, mentors, courses, lessons, resources, general. "
        "File type and size restrictions are applied per folder."
    ),
)
async def upload_media(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(..., description="The file to upload."),
    folder: str = Query(default="general", description="Logical upload folder/bucket."),
    subfolder: str | None = Query(
        default=None,
        description="Optional sub-path within the folder (e.g., a course or lesson UUID).",
    ),
) -> MediaUploadOut:
    media = await media_service.upload_file(
        db,
        file=file,
        folder=folder,
        uploaded_by=user.id,
        subfolder=subfolder,
    )
    db.commit()
    db.refresh(media)
    return MediaUploadOut(file=MediaFileOut.model_validate(media))


@router.get(
    "",
    response_model=list[MediaFileOut],
    summary="List media files",
    description=(
        "List your own uploaded files. Admins can optionally filter by uploader. "
        "Results are paginated (max 100 per page)."
    ),
)
def list_media(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    folder: str | None = Query(default=None, description="Filter by folder."),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[MediaFileOut]:
    # Non-admins can only see their own uploads
    uploader_filter = user.id if user.role not in (UserRole.ADMIN,) else None

    files = media_service.list_media_files(
        db,
        folder=folder,
        uploaded_by=uploader_filter,
        limit=limit,
        offset=offset,
    )
    return [MediaFileOut.model_validate(f) for f in files]


@router.get(
    "/{file_id}",
    response_model=MediaFileOut,
    summary="Get a media file record",
)
def get_media(
    file_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> MediaFileOut:
    media = media_service.get_media_file(db, file_id)
    # Non-admins may only view their own records
    if user.role not in (UserRole.ADMIN,) and media.uploaded_by != user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied.")
    return MediaFileOut.model_validate(media)


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a media file",
    description="Soft-deletes the record and removes the file from disk. Admins may delete any file.",
)
def delete_media(
    file_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Response:
    media_service.delete_media_file(
        db,
        file_id,
        requesting_user_id=user.id,
        is_admin=user.role == UserRole.ADMIN,
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
