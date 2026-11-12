"""Shared metadata for the German CEFR classroom ladder."""

from __future__ import annotations

MINUTES_PER_LESSON = 8

_PRICE_NAIRA = {
    "german-a1-zero-to-beginner": 55_000,
    "german-a1-advanced": 60_000,
    "german-a2-beginner": 65_000,
    "german-a2-advanced": 70_000,
    "german-b1-beginner": 80_000,
    "german-b1-advanced": 85_000,
    "german-b2-beginner": 95_000,
    "german-b2-advanced": 100_000,
    "german-c1-beginner": 110_000,
    "german-c1-advanced": 120_000,
    "german-c2-beginner": 135_000,
    "german-c2-advanced": 150_000,
}
_LEVEL_NAIRA = {"beginner": 55_000, "intermediate": 75_000, "advanced": 95_000}

EXAM_NOTE = (
    "It follows CEFR and the skill types used in Goethe-Zertifikat, telc Deutsch, and ÖSD at this level. "
    "Completing this course prepares you for those examinations. "
    "It does not itself award an official certificate. You must sit an accepted exam at an authorised centre."
)


def make_course(
    *,
    slug: str,
    title: str,
    subtitle: str,
    cefr: str,
    band: str,
    modules: list,
    focus: str,
    objectives: list[str],
    audience: str | None = None,
    topics: str | None = None,
    exam_names: str | None = None,
    price_cents: int | None = None,
    image_url: str | None = None,
) -> dict:
    lesson_count = sum(len(row[2]) for row in modules)
    who = audience or "for German learners at this CEFR band"
    topic_map = (topics or focus).rstrip()
    if not topic_map.endswith("."):
        topic_map += "."
    exams = exam_names or f"Goethe-Zertifikat {cefr}, telc Deutsch {cefr}, and ÖSD {cefr}"
    return {
        "slug": slug,
        "title": title,
        "subtitle": subtitle,
        "cefr_level": cefr,
        "band": band,
        "description": (
            f"A structured English-taught classroom programme {who}. "
            f"{len(modules)} modules and {lesson_count} practice lessons cover the {cefr} topic map: "
            f"{topic_map} "
            f"It follows CEFR {cefr} and the skill types used in {exams}. "
            "Completing this course prepares you for those examinations. "
            "It does not itself award an official certificate. You must sit an accepted exam "
            "at an authorised centre."
        ),
        "learning_objectives": "\n".join(objectives),
        "category": "german",
        "tags": f"german,{cefr.lower()},{band},cefr,goethe,telc",
        "image_url": image_url or f"/marketing/{slug}-cover.jpg",
        "price_cents": price_cents
        if price_cents is not None
        else _PRICE_NAIRA.get(slug, _LEVEL_NAIRA.get(band, 55_000)) * 100,
        "currency": "NGN",
        "duration_minutes": lesson_count * MINUTES_PER_LESSON,
        "lessons_count": lesson_count,
    }
