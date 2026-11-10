"""German A1 classroom modules. Titles and usage notes are English."""

from __future__ import annotations

from german_a1_phase1 import MODULES as PHASE1
from german_a1_phase2 import MODULES as PHASE2
from german_a1_phase3 import MODULES as PHASE3

MODULES = [*PHASE1, *PHASE2, *PHASE3]

LESSON_COUNT = sum(len(phrases) for _title, _scene, phrases in MODULES)
# Study time in the app: listen, repeat, spelling, usage, then module test.
# This is not a Goethe 45-minute classroom unit.
MINUTES_PER_LESSON = 8
DURATION_MINUTES = LESSON_COUNT * MINUTES_PER_LESSON

COURSE = {
    "slug": "german-a1-zero-to-beginner",
    "title": "German A1: Zero to Beginner",
    "subtitle": "Complete foundational German language programme",
    "description": (
        "A structured English-taught classroom programme for learners with no German. "
        f"{len(MODULES)} modules and {LESSON_COUNT} practice lessons cover the A1 topic map: "
        "alphabet, greetings, personal information, numbers and time, beginner grammar, "
        "family, food, home, work, travel, health, and exam-style tasks. "
        "It follows CEFR A1 and the skill types used in Goethe-Zertifikat A1, telc Deutsch A1, "
        "and ÖSD A1. Completing this course prepares you for those examinations. "
        "It does not itself award an official certificate. You must sit an accepted exam "
        "at an authorised centre."
    ),
    "learning_objectives": "\n".join(
        [
            "Recognise the German alphabet, special characters, and basic spelling patterns.",
            "Greet people, introduce yourself, and exchange personal information.",
            "Use numbers, dates, times, and prices in everyday situations.",
            "Build simple present-tense sentences, questions, and negatives.",
            "Use nominative, accusative, and common dative phrases at A1.",
            "Talk about family, food, home, work, travel, weather, clothing, and health.",
            "Listen for names, times, and short announcements.",
            "Read signs, forms, and short personal messages.",
            "Write short sentences and complete simple forms.",
            "Take part in short spoken conversations and requests.",
        ]
    ),
    "category": "german",
    "tags": "german,a1,cefr,beginner,goethe",
    "image_url": "/marketing/german-a1-cover.jpg",
    "price_cents": 990000,
    "currency": "NGN",
    "duration_minutes": DURATION_MINUTES,
}
