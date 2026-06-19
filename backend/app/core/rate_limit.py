"""Sliding-window rate limits via Redis (in-memory fallback when Redis is unavailable)."""

from __future__ import annotations

import logging
import time

from fastapi import HTTPException, status

_logger = logging.getLogger(__name__)

_memory: dict[str, list[float]] = {}


def _memory_check(key: str, limit: int, window_sec: int) -> bool:
    now = time.time()
    window = [t for t in _memory.get(key, []) if now - t < window_sec]
    if len(window) >= limit:
        _memory[key] = window
        return False
    window.append(now)
    _memory[key] = window
    return True


def check_rate_limit(key: str, *, limit: int, window_sec: int = 60) -> bool:
    """Return True when the request is allowed, False when rate limited."""
    try:
        from app.core.redis_client import get_redis

        r = get_redis()
        redis_key = f"multivate:rl:{key}"
        pipe = r.pipeline()
        pipe.incr(redis_key)
        pipe.expire(redis_key, window_sec, nx=True)
        count, _ = pipe.execute()
        return int(count) <= limit
    except Exception as exc:
        _logger.warning("Rate limit Redis unavailable key=%s — memory fallback: %s", key, exc)
        return _memory_check(key, limit, window_sec)


def enforce_rate_limit(
    key: str,
    *,
    limit: int,
    window_sec: int = 60,
    detail: str = "Too many requests. Please try again later.",
) -> None:
    if not check_rate_limit(key, limit=limit, window_sec=window_sec):
        _logger.info("Rate limit exceeded key=%s limit=%s window=%ss", key, limit, window_sec)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)
