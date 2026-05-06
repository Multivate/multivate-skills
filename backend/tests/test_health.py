from __future__ import annotations


def test_health_liveness(client) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_readiness(client) -> None:
    r = client.get("/health/ready")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ready"
    assert body.get("database") == "ok"
