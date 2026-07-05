from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

CATALOG_KEY = "cache:catalog:published"
REVIEWS_PUBLIC_PREFIX = "cache:reviews:public:"


def _redis():
    try:
        from app.core.redis_client import get_redis

        return get_redis()
    except Exception as exc:
        logger.debug("Cache unavailable: %s", exc)
        return None


def cache_get_json(key: str) -> Any | None:
    client = _redis()
    if client is None:
        return None
    try:
        raw = client.get(key)
        if not raw:
            return None
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Cache read failed key=%s: %s", key, exc)
        return None


def cache_set_json(key: str, value: Any, *, ttl_seconds: int) -> None:
    client = _redis()
    if client is None:
        return
    try:
        client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception as exc:
        logger.warning("Cache write failed key=%s: %s", key, exc)


def invalidate_catalog_cache() -> None:
    client = _redis()
    if client is None:
        return
    try:
        client.delete(CATALOG_KEY)
        logger.info("Cache invalidated: %s", CATALOG_KEY)
    except Exception as exc:
        logger.warning("Cache invalidate failed: %s", exc)


def invalidate_public_reviews_cache() -> None:
    client = _redis()
    if client is None:
        return
    try:
        for key in client.scan_iter(f"{REVIEWS_PUBLIC_PREFIX}*"):
            client.delete(key)
        logger.info("Cache invalidated: public reviews")
    except Exception as exc:
        logger.warning("Cache invalidate reviews failed: %s", exc)
