from __future__ import annotations

from tests.registration_utils import register_instructor_complete, register_student_complete

PROFILE = {
    "education_level": "bachelors",
    "current_skills": "x",
    "skills_to_learn": "y",
    "learning_goals": "z",
    "preferred_formats": "video",
    "weekly_hours": "5-10",
    "career_direction": "up",
}

TEACH = {
    "expertise_areas": "Cloud Computing, Data Science",
    "years_experience": "3to5",
    "teaching_formats": "Live online classes, Self-paced video courses",
}


def _register_student(client, email: str) -> dict:
    body = {
        "name": "Learner",
        "email": email,
        "password": "password123",
        "learning_profile": PROFILE,
    }
    return register_student_complete(client, body)


def _register_instructor(client, email: str) -> dict:
    body = {
        "name": "Teacher",
        "email": email,
        "password": "password123",
        "teaching_profile": TEACH,
    }
    return register_instructor_complete(client, body)


def _login(client, email: str) -> str:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_reviews_messages_certificates_flow(client) -> None:
    ins = _register_instructor(client, "t-rev@example.com")
    st = _register_student(client, "s-rev@example.com")
    tok_ins = ins["access_token"]
    tok_st = st["access_token"]

    slug = "api-review-course"
    cr = client.post(
        "/api/v1/courses",
        json={
            "slug": slug,
            "title": "Reviewable",
            "description": "d" * 20,
            "image_url": "https://example.com/x.png",
            "lessons_count": 2,
        },
        headers={"Authorization": f"Bearer {tok_ins}"},
    )
    assert cr.status_code == 201, cr.text

    er = client.post(
        "/api/v1/enrollments",
        json={"course_slug": slug},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert er.status_code == 204, er.text

    my_courses = client.get("/api/v1/learning/my-courses", headers={"Authorization": f"Bearer {tok_st}"})
    assert my_courses.status_code == 200, my_courses.text
    mc = my_courses.json()
    assert any(row.get("slug") == slug for row in mc)
    row = next(r for r in mc if r.get("slug") == slug)
    assert row.get("instructor_email") == "t-rev@example.com"
    assert row.get("instructor_name") == "Teacher"

    rv = client.post(
        "/api/v1/reviews",
        json={"course_slug": slug, "rating": 5, "comment": "Great"},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert rv.status_code == 200, rv.text
    data = rv.json()
    assert data["rating"] == 5

    lst = client.get("/api/v1/reviews/instructor/me", headers={"Authorization": f"Bearer {tok_ins}"})
    assert lst.status_code == 200
    rows = lst.json()
    assert len(rows) == 1
    assert rows[0]["course_slug"] == slug

    msg = client.post(
        "/api/v1/messages",
        json={"recipient_email": "t-rev@example.com", "subject": "Hi", "body": "Hello instructor"},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert msg.status_code == 201, msg.text

    inbox = client.get("/api/v1/messages/me", headers={"Authorization": f"Bearer {tok_ins}"})
    assert inbox.status_code == 200
    assert len(inbox.json()) == 1

    pr = client.patch(
        f"/api/v1/learning/progress/{slug}",
        json={"lesson_done": 2, "progress_pct": 100},
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert pr.status_code == 200, pr.text

    cert = client.post(
        f"/api/v1/learning/certificates/{slug}/issue",
        headers={"Authorization": f"Bearer {tok_st}"},
    )
    assert cert.status_code == 200, cert.text
    assert cert.json()["code"].startswith("MV-")

    mine = client.get("/api/v1/learning/certificates/me", headers={"Authorization": f"Bearer {tok_st}"})
    assert mine.status_code == 200
    assert len(mine.json()) == 1
