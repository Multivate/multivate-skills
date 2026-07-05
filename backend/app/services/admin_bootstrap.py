from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.role import UserRole
from app.models.user import User

_logger = logging.getLogger(__name__)

ADMIN_EMAIL = "admin@multivate.com.ng"
ADMIN_NAME = "Multivate Admin"
LEGACY_ADMIN_EMAILS = ("admin@example.com", "dev@multivate.local")


def _admin_password() -> str:
    return (get_settings().platform_admin_password or "").strip()


def ensure_platform_admin(db: Session, *, sync_password: bool = False) -> str:
    """Create or repair the platform admin. Idempotent — safe on every API startup."""
    bootstrap_password = _admin_password()
    target = db.execute(select(User).where(User.email == ADMIN_EMAIL)).scalar_one_or_none()
    if target:
        changed = False
        if target.role != UserRole.ADMIN:
            target.role = UserRole.ADMIN
            changed = True
        if not target.is_active:
            target.is_active = True
            changed = True
        if not target.two_factor_enabled:
            target.two_factor_enabled = True
            changed = True
        if sync_password and bootstrap_password:
            target.password_hash = hash_password(bootstrap_password)
            changed = True
        if changed:
            db.add(target)
            db.commit()
            _logger.info("Platform admin repaired email=%s role=admin", ADMIN_EMAIL)
            return "repaired"
        return "ok"

    for legacy_email in LEGACY_ADMIN_EMAILS:
        legacy = db.execute(select(User).where(User.email == legacy_email)).scalar_one_or_none()
        if legacy is None:
            continue
        legacy.email = ADMIN_EMAIL
        legacy.name = ADMIN_NAME
        legacy.password_hash = hash_password(bootstrap_password)
        legacy.role = UserRole.ADMIN
        legacy.is_active = True
        legacy.two_factor_enabled = True
        db.add(legacy)
        db.commit()
        _logger.info("Platform admin migrated %s -> %s", legacy_email, ADMIN_EMAIL)
        return "migrated"

    db.add(
        User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(bootstrap_password),
            role=UserRole.ADMIN,
            is_active=True,
            two_factor_enabled=True,
        )
    )
    db.commit()
    _logger.info("Platform admin created email=%s", ADMIN_EMAIL)
    return "created"
