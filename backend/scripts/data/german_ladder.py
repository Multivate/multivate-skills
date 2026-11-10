"""Shared metadata for the German CEFR classroom ladder."""

from __future__ import annotations

MINUTES_PER_LESSON = 8

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
    price_cents: int = 990_000,
    image_url: str | None = None,
) -> dict:
    lesson_count = sum(len(row[2]) for row in modules)
    return {
        "slug": slug,
        "title": title,
        "subtitle": subtitle,
        "cefr_level": cefr,
        "band": band,
        "description": (
            "A structured English-taught classroom programme. "
            f"{len(modules)} modules and {lesson_count} practice lessons. {focus} {EXAM_NOTE}"
        ),
        "learning_objectives": "\n".join(objectives),
        "category": "german",
        "tags": f"german,{cefr.lower()},{band},cefr,goethe,telc",
        "image_url": image_url or f"/marketing/{slug}-cover.jpg",
        "price_cents": price_cents,
        "currency": "NGN",
        "duration_minutes": lesson_count * MINUTES_PER_LESSON,
        "lessons_count": lesson_count,
    }
