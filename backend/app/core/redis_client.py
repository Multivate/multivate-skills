"""Sync Redis client for signup OTP storage."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.core.config import get_settings

if TYPE_CHECKING:
    from redis import Redis

_logger = logging.getLogger(__name__)
_client: "Redis | None" = None


def get_redis() -> "Redis":
    global _client
    if _client is None:
        import redis

        settings = get_settings()
        url = (settings.redis_url or "").strip()
        if not url:
            raise RuntimeError("REDIS_URL is empty; signup OTP requires Redis.")
        try:
            r = redis.from_url(url, decode_responses=True)
            r.ping()
            _client = r
        except Exception as exc:
            _logger.error("Redis ping failed url=%s: %s", url.split("@")[-1], exc)
            if settings.environment == "development":
                try:
                    import fakeredis
                except ImportError as imp_err:
                    raise RuntimeError(
                        "Cannot connect to Redis. Install fakeredis for a local dev fallback "
                        "(pip install fakeredis) or start Redis (e.g. docker compose up -d redis) "
                        "and keep REDIS_URL=redis://127.0.0.1:6379/0 in backend/.env.",
                    ) from imp_err
                _logger.warning(
                    "DEV: Redis unreachable; using in-memory fakeredis for signup OTP "
                    "(not shared across workers; data is lost when the API process exits).",
                )
                _client = fakeredis.FakeRedis(decode_responses=True)
            else:
                raise RuntimeError(
                    "Cannot connect to Redis. Start Redis (e.g. `docker compose up -d redis`) "
                    "or set REDIS_URL in backend/.env.",
                ) from exc
    return _client


def reset_redis_client_for_tests() -> None:
    """Close and clear singleton (pytest)."""
    global _client
    if _client is not None:
        try:
            _client.close()
        except Exception:
            pass
    _client = None
