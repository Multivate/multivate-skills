from __future__ import annotations

import logging
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.course import Course
from app.models.course_status import CourseStatus
from app.schemas.mentor import GuidanceChatIn, GuidanceChatOut

logger = logging.getLogger(__name__)
_settings = get_settings()

_SYSTEM_PROMPT = """You are Multivate AI, the official career and relocation guidance assistant on the Multivate learning platform.

Your role:
- Help users understand realistic paths to study, work, or train in Germany, with practical focus on learners from Nigeria and other African countries.
- Recommend German language levels (A1–C2) based on goals: university, Ausbildung, skilled employment, healthcare, IT, and similar fields.
- Suggest tech and career skills that align with Germany's job market and courses available on Multivate.
- When relevant, reference only courses from the catalog provided below.
- Be clear, factual, and structured. Note when visa or legal details may change and official sources should be checked.
- Never ask for passwords, payments, or personal documents.
- Do not use em dashes in replies. Use commas, periods, or short sentences instead.
- Never repeat a previous answer word for word. Build on what the user already asked and add new detail each turn.
- Keep follow-up replies shorter and more specific than your first reply.

Tone: professional, direct, and helpful. You represent Multivate, not a generic chatbot."""


def _catalog_context(db: Session) -> str:
    rows = list(
        db.scalars(
            select(Course)
            .where(Course.status == CourseStatus.PUBLISHED)
            .order_by(Course.title.asc())
            .limit(40)
        ).all()
    )
    if not rows:
        return "No published courses in catalog yet."
    lines = []
    for c in rows:
        level = getattr(c, "level", "") or ""
        category = getattr(c, "category", "") or ""
        lines.append(f"- {c.title} (slug: {c.slug}, level: {level}, category: {category})")
    return "\n".join(lines)


def _fallback_reply(message: str, catalog: str, history: list) -> str:
    lower = message.lower()
    prior = " ".join(item.content.lower() for item in history)

    if history:
        if any(w in lower for w in ("german", "language", "a1", "a2", "b1", "b2", "c1")):
            if "b1" in prior or "b2" in prior:
                return (
                    "To go deeper on German: tell me your current level and your goal in Germany "
                    "(university, Ausbildung, nursing, IT, or skilled work). I can suggest a realistic timeline "
                    "and which Multivate German courses fit your next step."
                )
            return (
                "For your next step, pick one goal: study, Ausbildung, or skilled work. "
                "That decides whether you should aim for B1, B2, or higher before you apply."
            )
        if any(w in lower for w in ("nigeria", "africa", "visa", "relocate", "move", "germany")):
            return (
                "Share three details and I will narrow this down: your education, work experience, "
                "and target timeline. I can then suggest whether study, Ausbildung, or skilled employment "
                "is the most realistic route for you."
            )
        return (
            "Tell me one thing you want to figure out next: German level, visa route, or which skills to build. "
            "I will focus on that instead of repeating the overview."
        )

    if any(w in lower for w in ("german", "language", "a1", "a2", "b1", "b2")):
        return (
            "For most paths to Germany, German matters, even for many English-taught roles.\n\n"
            "• University / Ausbildung: often B1–B2 before applying; C1 for some regulated fields.\n"
            "• Skilled work (IT, engineering): B1 is a strong minimum; B2 opens more doors.\n"
            "• Starting from zero: plan 6–12 months for A1→B1 with consistent study.\n\n"
            "On Multivate, look for German courses matching your current level. "
            "Tell me your goal (study, work, or family reunion) and I'll narrow this down."
        )
    if any(w in lower for w in ("nigeria", "africa", "visa", "relocate", "move")):
        return (
            "Many learners from Nigeria and across Africa succeed in Germany through study, "
            "Ausbildung (vocational training), or skilled employment.\n\n"
            "Typical steps: clarify your goal → check qualification recognition → build German (and relevant tech skills) → "
            "prepare finances (blocked account for students) → apply for visa through the German mission in your country.\n\n"
            "What is your background and target timeline? I can suggest a learning path on Multivate."
        )
    catalog_hint = ""
    if catalog and catalog != "No published courses in catalog yet.":
        catalog_hint = f"\n\nSome learning paths on Multivate:\n{catalog[:800]}"
    return (
        "I'm here to help you plan your path to Germany: language, skills, and career direction.\n\n"
        "Share your current situation (country, education, work experience) and what you hope to do in Germany."
        f"{catalog_hint}"
    )


async def chat(db: Session, body: GuidanceChatIn) -> GuidanceChatOut:
    session_id = (body.session_id or "").strip() or secrets.token_urlsafe(16)
    catalog = _catalog_context(db)
    api_key = (_settings.gemini_api_key or "").strip()

    if not api_key:
        logger.warning("Guidance chat: GEMINI_API_KEY not set, using fallback.")
        return GuidanceChatOut(reply=_fallback_reply(body.message, catalog, body.history), session_id=session_id)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        contents: list[types.Content] = []
        for item in body.history[-12:]:
            contents.append(
                types.Content(
                    role="user" if item.role == "user" else "model",
                    parts=[types.Part.from_text(text=item.content)],
                )
            )
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=body.message)],
            )
        )
        response = await client.aio.models.generate_content(
            model=_settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=f"{_SYSTEM_PROMPT}\n\nPublished Multivate courses:\n{catalog}",
            ),
        )
        reply = (response.text or "").strip()
        if not reply:
            reply = _fallback_reply(body.message, catalog, body.history)
        logger.info("Guidance chat session=%s chars_in=%s chars_out=%s", session_id, len(body.message), len(reply))
        return GuidanceChatOut(reply=reply, session_id=session_id)
    except Exception:
        logger.exception("Guidance chat Gemini error session=%s", session_id)
        return GuidanceChatOut(reply=_fallback_reply(body.message, catalog, body.history), session_id=session_id)
