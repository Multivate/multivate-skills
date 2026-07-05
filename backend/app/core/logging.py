from __future__ import annotations

import logging
import sys
from typing import Final

_DEFAULT_FORMAT: Final[str] = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def configure_logging(level: str = "INFO") -> None:
    """Idempotent: safe to call multiple times (e.g. tests + app startup)."""
    root = logging.getLogger()
    if root.handlers:
        root.setLevel(_resolve_level(level))
        return

    logging.basicConfig(
        level=_resolve_level(level),
        format=_DEFAULT_FORMAT,
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
        force=False,
    )
    # Reduce noise from overly chatty third-party loggers in production-like runs.
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)


def _resolve_level(name: str) -> int:
    try:
        return getattr(logging, name.upper())
    except AttributeError:
        return logging.INFO
