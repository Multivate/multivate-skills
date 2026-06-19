import os
from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET_MARKER = "dev-only-change-in-production-min-32-characters-long"
_DEV_ADMIN_PASSWORD = "Multivate2026!"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Controls security defaults, logging noise, and schema bootstrap behaviour.",
    )

    log_level: str = Field(default="INFO", description="Root log level: DEBUG, INFO, WARNING, ERROR.")

    # Default matches root `docker-compose.yml` (`db` service). Override `DATABASE_URL` in production (Render, Railway, etc.).
    database_url: str = "postgresql://multivate:multivate@localhost:5432/multivate"

    redis_url: str = Field(
        default="redis://127.0.0.1:6379/0",
        description="Redis for short-lived signup OTP payloads (must match docker-compose `redis` if used).",
    )

    secret_key: str = _DEV_SECRET_MARKER
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "https://multivate.com.ng,https://www.multivate.com.ng,"
        "https://multivateco.vercel.app"
    )

    platform_admin_password: str = Field(
        default=_DEV_ADMIN_PASSWORD,
        description="Bootstrap password for admin@multivate.com.ng. Set PLATFORM_ADMIN_PASSWORD in production.",
    )

    auto_create_tables: bool = Field(
        default=True,
        description="If true, SQLAlchemy creates missing tables on startup. "
        "Must be false in production — use Alembic migrations instead.",
    )

    # Outbound mail: Resend only (https://resend.com). One API key on the server — end users never paste mail passwords.
    resend_api_key: str = Field(
        default="",
        description="Resend API key. Required in staging/production to send OTP mail.",
    )
    resend_from: str = Field(
        default="Multivate <info@multivate.com.ng>",
        description='Verified sender, e.g. "Multivate <info@multivate.com.ng>".',
    )
    mail_from: str = Field(
        default="Multivate <info@multivate.com.ng>",
        validation_alias=AliasChoices("MAIL_FROM", "SMTP_FROM"),
        description="Fallback From / mailto identity when RESEND_FROM is empty (local dev).",
    )

    mail_footer_line: str = Field(
        default="Delivered by Multivate - online learning and career skills.",
        description="Footer line in OTP HTML emails.",
    )
    mail_support_url: str = Field(
        default="mailto:info@multivate.com.ng",
        description="Optional https:// or mailto: link for “Contact us” in OTP emails.",
    )

    # Bank transfer (shown to students during enrollment checkout)
    bank_name: str = Field(default="Wema Bank")
    bank_account_name: str = Field(default="Multivate Technological Services and Consultancy Limited")
    bank_account_number: str = Field(default="0125918288")
    bank_transfer_currency: str = Field(default="NGN", min_length=3, max_length=3)

    # Local media storage (non-secret paths — swap to S3/R2 later)
    media_root: str = Field(
        default="media",
        description="Directory under backend/ for uploaded course thumbnails and videos.",
    )
    media_stream_token_minutes: int = Field(
        default=120,
        description="Signed stream token lifetime for protected lesson videos.",
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
            if not (self.resend_api_key or "").strip():
                raise ValueError(
                    "RESEND_API_KEY is required in staging/production (transactional email is Resend-only)."
                )
            admin_pwd = (self.platform_admin_password or "").strip()
            if len(admin_pwd) < 12:
                raise ValueError("PLATFORM_ADMIN_PASSWORD must be at least 12 characters in staging/production.")
            if admin_pwd == _DEV_ADMIN_PASSWORD:
                raise ValueError(
                    "PLATFORM_ADMIN_PASSWORD must not use the default dev password in staging/production."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
