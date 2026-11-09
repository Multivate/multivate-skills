from __future__ import annotations

from dataclasses import dataclass
from typing import Any

GOAL_CODES = ("work", "study", "train", "live", "explore")
GERMAN_LEVELS = ("none", "a1", "a2", "b1", "b2", "c1", "c2")
LOCALES = ("en", "fr", "de", "es")

_WEEKLY = {
    "under5": {"code": "under5", "session": 15, "days": 4, "week_minutes": 60},
    "5to10": {"code": "5to10", "session": 30, "days": 5, "week_minutes": 150},
    "10to15": {"code": "10to15", "session": 60, "days": 6, "week_minutes": 360},
    "15plus": {"code": "15plus", "session": 90, "days": 6, "week_minutes": 540},
}
_WEEKLY_ALIAS = {
    "5-10": "5to10",
    "10-15": "10to15",
    "under-5": "under5",
    "under 5": "under5",
    "15+": "15plus",
}

_GOAL_SUMMARY = {
    "work": "skilled work in Germany",
    "study": "university study in Germany",
    "train": "Ausbildung in Germany",
    "live": "everyday life in Germany",
    "explore": "finding a path to Germany",
}


def parse_note_map(notes: str | None) -> dict[str, str]:
    out: dict[str, str] = {}
    if not notes:
        return out
    for part in notes.split(";"):
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        key = key.strip().lower()
        value = value.strip()
        if key and value:
            out[key] = value
    return out


def locale_from_notes(notes: str | None, prefix: str = "learn_with") -> str | None:
    mapped = parse_note_map(notes)
    value = mapped.get(prefix) or mapped.get(f"{prefix}:")
    if value in LOCALES:
        return value
    return None


def normalize_weekly_hours(raw: str | None) -> str:
    value = (raw or "5to10").strip().lower()
    value = _WEEKLY_ALIAS.get(value, value)
    return value if value in _WEEKLY else "5to10"


def weekly_plan(raw: str | None) -> dict[str, int | str]:
    return _WEEKLY[normalize_weekly_hours(raw)]


def normalize_goal(raw: str | None) -> str:
    value = (raw or "explore").strip().lower()
    return value if value in GOAL_CODES else "explore"


def normalize_german_level(raw: str | None) -> str:
    value = (raw or "none").strip().lower()
    return value if value in GERMAN_LEVELS else "none"


def german_rank(level: str) -> int:
    try:
        return GERMAN_LEVELS.index(normalize_german_level(level))
    except ValueError:
        return 0


def topic_flags(skills_to_learn: str | None) -> tuple[str, bool, bool]:
    raw = (skills_to_learn or "").strip() or "Technology"
    lowered = raw.lower()
    wants_german = "german" in lowered or "deutsch" in lowered
    wants_tech = "technolog" in lowered or "tech" in lowered
    if wants_german and wants_tech:
        return "German, Technology", True, True
    if wants_german:
        return "German", True, False
    if lowered in {"technology", "tech"}:
        return "Technology", False, True
    return raw, False, True


@dataclass(frozen=True)
class LearningIntent:
    topic: str
    wants_german: bool
    wants_tech: bool
    goal: str
    german_level: str
    german_rank: int
    locale: str
    weekly_hours: str
    session_minutes: int
    week_days: int
    week_minutes: int
    weekly_course_target: int

    @property
    def german_first(self) -> bool:
        return self.wants_german and self.wants_tech and self.german_rank < 3

    @property
    def goal_label(self) -> str:
        return _GOAL_SUMMARY[self.goal]


def intent_from_values(
    *,
    skills_to_learn: str | None,
    goal_code: str | None = None,
    career_direction: str | None = None,
    german_level: str | None = None,
    current_skills: str | None = None,
    instruction_locale: str | None = None,
    extra_notes: str | None = None,
    weekly_hours: str | None = None,
    learn_with: str | None = None,
) -> LearningIntent:
    notes = parse_note_map(extra_notes)
    topic, wants_german, wants_tech = topic_flags(skills_to_learn)
    goal = normalize_goal(goal_code or career_direction or notes.get("goal"))
    level = normalize_german_level(german_level or current_skills or notes.get("level"))
    locale = (instruction_locale or learn_with or notes.get("learn_with") or "en").strip().lower()
    if locale not in LOCALES:
        locale = "en"
    plan = weekly_plan(weekly_hours)
    hours = str(plan["code"])
    week_minutes = int(plan["week_minutes"])
    session = int(plan["session"])
    days = int(plan["days"])
    return LearningIntent(
        topic=topic,
        wants_german=wants_german,
        wants_tech=wants_tech,
        goal=goal,
        german_level=level if wants_german else "none",
        german_rank=german_rank(level) if wants_german else 0,
        locale=locale,
        weekly_hours=hours,
        session_minutes=session,
        week_days=days,
        week_minutes=week_minutes,
        weekly_course_target=1 if hours in {"under5", "5to10"} else 2,
    )


def intent_from_profile(profile: Any | None, *, learn_with: str | None = None) -> LearningIntent:
    if profile is None:
        return intent_from_values(skills_to_learn=None, learn_with=learn_with)
    return intent_from_values(
        skills_to_learn=getattr(profile, "skills_to_learn", None),
        goal_code=getattr(profile, "goal_code", None),
        career_direction=getattr(profile, "career_direction", None),
        german_level=getattr(profile, "german_level", None),
        current_skills=getattr(profile, "current_skills", None),
        instruction_locale=getattr(profile, "instruction_locale", None),
        extra_notes=getattr(profile, "extra_notes", None),
        weekly_hours=getattr(profile, "weekly_hours", None),
        learn_with=learn_with,
    )


def profile_write_fields(payload: dict[str, Any]) -> dict[str, Any]:
    intent = intent_from_values(
        skills_to_learn=payload.get("skills_to_learn"),
        goal_code=payload.get("goal_code"),
        career_direction=payload.get("career_direction"),
        german_level=payload.get("german_level"),
        current_skills=payload.get("current_skills"),
        instruction_locale=payload.get("instruction_locale"),
        extra_notes=payload.get("extra_notes"),
        weekly_hours=payload.get("weekly_hours"),
    )
    return {
        "education_level": payload.get("education_level") or "other",
        "current_skills": intent.german_level if intent.wants_german else payload.get("current_skills"),
        "skills_to_learn": intent.topic,
        "learning_goals": payload.get("learning_goals") or f"Prepare for {intent.goal_label}",
        "preferred_formats": payload.get("preferred_formats") or "Online (self-paced)",
        "weekly_hours": intent.weekly_hours,
        "weekly_course_target": intent.weekly_course_target,
        "reminder_minutes": intent.session_minutes,
        "career_direction": intent.goal,
        "extra_notes": f"learn_with:{intent.locale};level:{intent.german_level};goal:{intent.goal}",
        "goal_code": intent.goal,
        "german_level": intent.german_level,
        "instruction_locale": intent.locale,
    }


def path_summary(intent: LearningIntent) -> str:
    if intent.wants_german and intent.wants_tech:
        if intent.german_first:
            return (
                f"Start with German at your level, then add technology courses for {intent.goal_label}. "
                f"Plan about {intent.session_minutes} minutes on {intent.week_days} days each week."
            )
        return (
            f"Keep German moving and build the technology skills for {intent.goal_label}. "
            f"Plan about {intent.session_minutes} minutes on {intent.week_days} days each week."
        )
    if intent.wants_german:
        return (
            f"Follow a German path for {intent.goal_label}, from {intent.german_level} upward. "
            f"Plan about {intent.session_minutes} minutes on {intent.week_days} days each week."
        )
    return (
        f"Follow a technology path for {intent.goal_label}. "
        f"Plan about {intent.session_minutes} minutes on {intent.week_days} days each week."
    )
