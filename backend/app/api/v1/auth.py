from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TokenPair
from app.schemas.user import UserPublic
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register_account(
    data: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    return auth_service.register_user(db, data)


@router.post("/login", response_model=AuthResponse)
def login_account(
    data: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    return auth_service.login_user(db, data)


class RefreshBody(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenPair)
def refresh_session(
    body: RefreshBody,
    db: Annotated[Session, Depends(get_db)],
) -> TokenPair:
    return auth_service.refresh_tokens_for_user(db, body.refresh_token)


@router.get("/me", response_model=UserPublic)
def read_me(current: Annotated[User, Depends(get_current_user)]) -> User:
    return current
