from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.services.geo_ip_service import VisitorGeo, ngn_kobo_to_usd_cents, reject_on_premise_if_blocked
from app.services.geo_ip_service import ON_PREMISE_BLOCK
from fastapi import HTTPException


def test_private_ip_counts_as_nigeria(client: TestClient) -> None:
    res = client.get("/api/v1/geo/visitor")
    assert res.status_code == 200
    body = res.json()
    assert body["in_nigeria"] is True
    assert body["display_currency"] == "NGN"
    assert body["on_premise_allowed"] is True
    assert body["warning"] is None


def test_country_header_outside_nigeria_shows_usd(client: TestClient) -> None:
    res = client.get("/api/v1/geo/visitor", headers={"CF-IPCountry": "DE"})
    assert res.status_code == 200
    body = res.json()
    assert body["country_code"] == "DE"
    assert body["in_nigeria"] is False
    assert body["display_currency"] == "USD"
    assert body["on_premise_allowed"] is False
    assert "On-premise" in (body["warning"] or "")
    assert "US dollars" in (body["warning"] or "")


def test_force_country_override(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GEO_FORCE_COUNTRY", "US")
    get_settings.cache_clear()
    try:
        res = client.get("/api/v1/geo/visitor", headers={"CF-IPCountry": "NG"})
        assert res.json()["country_code"] == "US"
        assert res.json()["in_nigeria"] is False
    finally:
        monkeypatch.delenv("GEO_FORCE_COUNTRY", raising=False)
        get_settings.cache_clear()


def test_usd_display_conversion() -> None:
    # 990,000 kobo = ₦9,900. At 1,500 naira per dollar -> $6.60.
    assert ngn_kobo_to_usd_cents(990_000, 1500) == 660


def test_on_premise_rejected_outside_nigeria() -> None:
    visitor = VisitorGeo(country_code="GB", in_nigeria=False, ngn_per_usd=1500)
    try:
        reject_on_premise_if_blocked("physical", visitor)
        raise AssertionError("expected HTTPException")
    except HTTPException as exc:
        assert exc.status_code == 400
        assert exc.detail == ON_PREMISE_BLOCK
    reject_on_premise_if_blocked("online", visitor)
