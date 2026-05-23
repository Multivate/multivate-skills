"""Idempotent Postgres patches for databases created before newer columns/tables existed."""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def apply_schema_patches(engine: Engine) -> None:
    """
    create_all() does not ALTER existing tables. Render/production DBs that booted on an
    older model set need these patches before auth routes can query users.two_factor_enabled.
    """
    inspector = inspect(engine)
    with engine.begin() as conn:
        if inspector.has_table("users"):
            user_cols = {c["name"] for c in inspector.get_columns("users")}
            if "two_factor_enabled" not in user_cols:
                conn.execute(
                    text(
                        "ALTER TABLE users "
                        "ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT TRUE"
                    )
                )
                logger.info("Schema patch: added users.two_factor_enabled")

    logger.info("Schema patches: complete")
