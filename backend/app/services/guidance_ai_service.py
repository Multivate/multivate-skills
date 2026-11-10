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

_SYSTEM_PROMPT = """You are Kay, a real person who guides learners on Multivate. You help people plan German, study, and work in Germany, especially from Nigeria and other African countries.

Talk like a helpful colleague on WhatsApp, not like a support bot or an AI.
- Use contractions (I'm, you'll, that's).
- Answer the question first, in plain sentences.
- Keep it to 2-4 short paragraphs. Add a simple list only if the steps would be messy in prose.
- Do not use labels like "What this means", "Next steps", "Start here", or "As an AI".
- Do not use emojis, tables, or # headings.
- Do not stack greetings. After the first message, skip "Hi, I'm Kay".
- If a Multivate course fits, name it in **bold** and say why in one line.
- Be honest when visa or legal rules can change. Suggest they confirm with the official German mission.
- Never ask for passwords, payments, or personal documents.
- Do not use em dashes. Use commas or full stops.
- Never copy a previous reply. Add something new each turn.
- End with one natural question, the way a person would, not a form.

You represent Multivate. Sound warm, calm, and specific."""


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
                    "Okay, let's make this specific. If you tell me whether you're around A1, A2, or B1, "
                    "and whether this is for university, Ausbildung, or a job, I can map a realistic timeline "
                    "and point you to the right Multivate German course.\n\n"
                    "Where are you with German right now?"
                )
            return (
                "It depends what you're aiming for. Study or Ausbildung usually needs B1 or B2 before you apply. "
                "For skilled work, B1 is a solid floor and B2 opens more doors. We should pick the path first, "
                "then set the level.\n\n"
                "Are you trying to study, train, or work?"
            )
        if any(w in lower for w in ("nigeria", "africa", "visa", "relocate", "move", "germany")):
            return (
                "I can get more useful if I know a bit about you. What's your highest education, "
                "what work have you done, and when do you want to move? With that I can say whether "
                "study, Ausbildung, or skilled work is the more realistic route."
            )
        return (
            "Let's pick one thing and go deep on it instead of covering everything again. "
            "German, the visa route, or the skills you should build first.\n\n"
            "Which of those is on your mind today?"
        )

    if any(w in lower for w in ("german", "language", "a1", "a2", "b1", "b2")):
        return (
            "You'll need German for almost every path, even when the job is advertised in English.\n\n"
            "If you want university or Ausbildung, think B1 to B2 before you apply. Some regulated fields go to C1. "
            "For IT or engineering work, B1 is a strong minimum. From zero, most people need about 6 to 12 months "
            "of steady study to reach B1.\n\n"
            "What's the goal, study, work, or joining family?"
        )
    if any(w in lower for w in ("nigeria", "africa", "visa", "relocate", "move")):
        return (
            "From Nigeria and other African countries, people usually come through study, Ausbildung, or skilled work.\n\n"
            "In practice it goes: pick the route that matches your education, check if Germany needs to recognise "
            "your qualification, build German and the job skills, sort finances, then apply through the German mission "
            "in your country. Rules do shift, so we'll treat the official site as the last word.\n\n"
            "What's your background, and when are you hoping to move?"
        )
    extra = (
        " Once I know that, I can also point you to a course on Multivate."
        if catalog and catalog != "No published courses in catalog yet."
        else ""
    )
    return (
        "Hey, I'm Kay. I help people get ready for Germany: the language, the skills, and a route that actually fits."
        f"{extra}\n\n"
        "Tell me where you are now. What do you want in Germany, study, training, or work?"
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
