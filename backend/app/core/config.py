import os
from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET_MARKER = "dev-only-change-in-production-min-32-characters-long"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Controls security defaults, logging noise, and schema bootstrap behaviour.",
    )

    log_level: str = Field(default="INFO", description="Root log level: DEBUG, INFO, WARNING, ERROR.")

    # Default matches root `docker-compose.yml` (`db` service). Override `DATABASE_URL` in production (Render, Railway, etc.).
    database_url: str = "postgresql://multivate:multivate@localhost:5432/multivate"

    secret_key: str = _DEV_SECRET_MARKER
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:3002,http://localhost:3003"
    )

    auto_create_tables: bool = Field(
        default=True,
        description="If true, SQLAlchemy creates missing tables on startup. "
        "Must be false in production — use Alembic migrations instead.",
    )

    @model_validator(mode="after")
    def require_render_database_url(self) -> "Settings":
        """Render sets RENDER=true. Without DATABASE_URL, the model default targets localhost and boot fails."""
        if os.environ.get("RENDER", "").lower() != "true":
            return self
        raw = os.environ.get("DATABASE_URL")
        if raw is None or not str(raw).strip():
            raise ValueError(
                "DATABASE_URL is not set. In the Render Dashboard: open your Web Service → Environment → "
                "add DATABASE_URL using your Render PostgreSQL connection string (database → Info → "
                "External or Internal Database URL), or link the database to this service so Render injects it."
            )
        url_lower = self.database_url.lower()
        if "localhost" in url_lower or "127.0.0.1" in url_lower:
            raise ValueError(
                "DATABASE_URL must not point to localhost on Render. Paste the PostgreSQL URL from your "
                "Render database service (hostname looks like dpg-xxxxx-a.REGION-postgres.render.com)."
            )
        return self

    @model_validator(mode="after")
    def enforce_production_rules(self) -> "Settings":
        if self.environment in ("staging", "production"):
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be at least 32 characters in staging/production.")
            if self.secret_key.strip() == _DEV_SECRET_MARKER:
                raise ValueError("SECRET_KEY must be changed from the development placeholder in staging/production.")
            if self.auto_create_tables:
                raise ValueError(
                    "AUTO_CREATE_TABLES must be false in staging/production. "
                    "Apply schema changes with Alembic (or your migration tool), not create_all()."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
