from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token, verify_token_type
from app.models.role import UserRole
from app.models.user import User
from app.services.auth_service import get_user_by_id

security = HTTPBearer(auto_error=False)


def get_token(creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]) -> str:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return creds.credentials


def get_current_user_id(token: Annotated[str, Depends(get_token)]) -> UUID:
    try:
        payload = decode_token(token)
        return verify_token_type(payload, "access")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        ) from exc


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
) -> User:
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user


def require_roles(*roles: UserRole) -> Callable[..., User]:
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return role_checker
