"""Visitor country from request IP or CDN country headers."""

from __future__ import annotations

import ipaddress
import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass

from fastapi import Request

from app.core.config import get_settings
from app.core import redis_client
from app.schemas.geo import VisitorGeoOut

_logger = logging.getLogger(__name__)

_COUNTRY_HEADERS = (
    "cf-ipcountry",
    "cloudfront-viewer-country",
    "x-vercel-ip-country",
    "x-country-code",
    "x-geo-country",
)
_CACHE_PREFIX = "multivate:geo:ip:"
_CACHE_TTL_SEC = 7 * 24 * 3600
_LOOKUP_TIMEOUT_SEC = 1.6

ON_PREMISE_BLOCK = (
    "On-premise and hybrid classes in Ibadan are only for learners in Nigeria. "
    "You can register for online classes."
)
FOREIGN_PRICE_NOTE = (
    "You are visiting from outside Nigeria. Prices are shown in US dollars, converted from the naira list price. "
    "Payment on this site is still collected in naira. "
    + ON_PREMISE_BLOCK
)


@dataclass(frozen=True)
class VisitorGeo:
    country_code: str
    in_nigeria: bool
    ngn_per_usd: float

    @property
    def display_currency(self) -> str:
        return "NGN" if self.in_nigeria else "USD"

    @property
    def on_premise_allowed(self) -> bool:
        return self.in_nigeria

    @property
    def warning(self) -> str | None:
        if self.in_nigeria:
            return None
        return FOREIGN_PRICE_NOTE

    def to_out(self) -> VisitorGeoOut:
        return VisitorGeoOut(
            country_code=self.country_code,
            in_nigeria=self.in_nigeria,
            display_currency=self.display_currency,
            ngn_per_usd=self.ngn_per_usd,
            on_premise_allowed=self.on_premise_allowed,
            warning=self.warning,
        )


def client_ip(request: Request) -> str:
    for key in ("cf-connecting-ip", "x-real-ip"):
        raw = (request.headers.get(key) or "").strip()
        if raw:
            return raw.split(",")[0].strip()
    forwarded = (request.headers.get("x-forwarded-for") or "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def _is_non_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return True
    return bool(
        addr.is_private
        or addr.is_loopback
        or addr.is_reserved
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_unspecified
    )


def _normalize_country(raw: str | None) -> str | None:
    code = (raw or "").strip().upper()
    if len(code) != 2 or not code.isalpha():
        return None
    if code in {"XX", "T1", "A1", "A2"}:
        return None
    return code


def _header_country(request: Request) -> str | None:
    for key in _COUNTRY_HEADERS:
        found = _normalize_country(request.headers.get(key))
        if found:
            return found
    return None


def _cache_get(ip: str) -> str | None:
    try:
        raw = redis_client.get_redis().get(f"{_CACHE_PREFIX}{ip}")
    except Exception:
        return None
    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return _normalize_country(str(raw))
    if isinstance(payload, dict):
        return _normalize_country(str(payload.get("cc") or ""))
    return _normalize_country(str(payload))


def _cache_set(ip: str, country: str) -> None:
    try:
        redis_client.get_redis().setex(
            f"{_CACHE_PREFIX}{ip}",
            _CACHE_TTL_SEC,
            json.dumps({"cc": country}),
        )
    except Exception:
        return


def lookup_country_for_ip(ip: str) -> str | None:
    """Public IP country lookup. Tests may monkeypatch this."""
    url = f"http://ip-api.com/json/{ip}?fields=status,countryCode"
    try:
        with urllib.request.urlopen(url, timeout=_LOOKUP_TIMEOUT_SEC) as resp:
            body = resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        _logger.info("Geo IP lookup skipped ip=%s err=%s", ip.split(".")[0] + ".x", type(exc).__name__)
        return None
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or data.get("status") != "success":
        return None
    return _normalize_country(str(data.get("countryCode") or ""))


def resolve_visitor(request: Request) -> VisitorGeo:
    settings = get_settings()
    forced = _normalize_country(settings.geo_force_country)
    if forced:
        return _from_country(forced)

    header_cc = _header_country(request)
    if header_cc:
        return _from_country(header_cc)

    ip = client_ip(request)
    if _is_non_public_ip(ip):
        return _from_country("NG")

    cached = _cache_get(ip)
    if cached:
        return _from_country(cached)

    looked = None
    if settings.geo_lookup_enabled:
        looked = lookup_country_for_ip(ip)
        if looked:
            _cache_set(ip, looked)
            return _from_country(looked)

    return _from_country("NG")


def _from_country(code: str) -> VisitorGeo:
    settings = get_settings()
    rate = float(settings.geo_ngn_per_usd or 0) or 1500.0
    return VisitorGeo(country_code=code, in_nigeria=code == "NG", ngn_per_usd=rate)


def ngn_kobo_to_usd_cents(kobo: int, ngn_per_usd: float) -> int:
    if kobo <= 0:
        return 0
    rate = ngn_per_usd if ngn_per_usd > 0 else 1500.0
    naira = kobo / 100.0
    return max(1, int(round((naira / rate) * 100)))


def reject_on_premise_if_blocked(study_mode: str | None, visitor: VisitorGeo) -> None:
    from fastapi import HTTPException, status

    from app.services.learning_intent import normalize_study_mode

    mode = normalize_study_mode(study_mode)
    if visitor.on_premise_allowed:
        return
    if mode in {"hybrid", "physical"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ON_PREMISE_BLOCK)
