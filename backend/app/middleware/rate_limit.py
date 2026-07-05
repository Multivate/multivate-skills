from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.rate_limit import check_rate_limit

_logger = logging.getLogger(__name__)

# (path prefix, max requests, window seconds)
_ROUTE_LIMITS: tuple[tuple[str, int, int], ...] = (
    ("/api/v1/auth/login", 20, 60),
    ("/api/v1/auth/login/mfa", 25, 60),
    ("/api/v1/auth/register/", 12, 60),
    ("/api/v1/auth/forgot-password/", 10, 60),
    ("/api/v1/discount-codes/validate", 40, 60),
)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        for prefix, limit, window_sec in _ROUTE_LIMITS:
            if not path.startswith(prefix):
                continue
            ip = _client_ip(request)
            key = f"ip:{ip}:{prefix}"
            if not check_rate_limit(key, limit=limit, window_sec=window_sec):
                rid = getattr(request.state, "request_id", None)
                _logger.info("IP rate limit path=%s ip=%s", path, ip)
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Too many requests. Please wait a moment and try again.",
                        "request_id": rid,
                    },
                )
            break

        return await call_next(request)
