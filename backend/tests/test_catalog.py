from __future__ import annotations


def test_list_courses_public(client) -> None:
    r = client.get("/api/v1/courses")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
