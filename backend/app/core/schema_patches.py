"""Idempotent Postgres patches for databases created before newer columns/tables existed."""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.core.database import Base

logger = logging.getLogger(__name__)


def _db_tail(database_url: str) -> str:
    """Log-safe hint: host/db name without credentials."""
    if "@" in database_url:
        return database_url.split("@", 1)[-1]
    return database_url[:64]


def apply_schema_patches(engine: Engine, *, database_url: str = "") -> None:
    """
    create_all() does not ALTER existing tables. Production DBs that booted on an older
    model set need these patches before auth routes can query users.two_factor_enabled.
    """
    if database_url:
        logger.info("Schema patches: target database …%s", _db_tail(database_url))

    inspector = inspect(engine)
    if inspector.has_table("users"):
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )
    else:
        logger.warning("Schema patch: users table missing; create_all will create it")

    inspector = inspect(engine)
    if inspector.has_table("users"):
        cols = {c["name"] for c in inspector.get_columns("users")}
        if "two_factor_enabled" not in cols:
            logger.error("Schema patch failed: users.two_factor_enabled still missing")
        else:
            logger.info("Schema patch: users.two_factor_enabled present")

    Base.metadata.create_all(bind=engine)
    logger.info("Schema patches: create_all() for any missing tables finished")
