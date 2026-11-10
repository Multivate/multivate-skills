from __future__ import annotations

import json
import logging
import re

from app.core.config import get_settings

log = logging.getLogger(__name__)
SCENE_KEYS = ("cafe", "office", "campus", "street")

# English (normalized) -> German, IPA, usage
_BANK: dict[str, tuple[str, str, str]] = {
    "hello": ("Hallo", "ˈha.lo", "When you greet someone, any time of day."),
    "hi": ("Hi", "haɪ", "A casual hello with friends or classmates."),
    "good morning": ("Guten Morgen", "ˈguː.tən ˈmɔʁ.ɡn̩", "In the morning, at work, on campus, or in a shop."),
    "good day": ("Guten Tag", "ˈguː.tən taːk", "A standard daytime greeting in shops and offices."),
    "good evening": ("Guten Abend", "ˈguː.tən ˈaː.bənt", "When you greet someone after about 6 pm."),
    "good night": ("Gute Nacht", "ˈguː.tə naxt", "When you say goodbye at night."),
    "how are you": ("Wie geht es dir?", "viː ɡeːt ɛs diːɐ", "When you ask someone you know how they are."),
    "i am fine": ("Mir geht es gut", "miːɐ ɡeːt ɛs ɡuːt", "When someone asks how you are."),
    "thank you": ("Danke", "ˈdaŋ.kə", "When someone helps you or gives you something."),
    "thanks": ("Danke", "ˈdaŋ.kə", "When someone helps you or gives you something."),
    "please": ("Bitte", "ˈbɪ.tə", "When you ask for something politely."),
    "you are welcome": ("Bitte schön", "ˈbɪ.tə ʃøːn", "When someone says thank you."),
    "yes": ("Ja", "jaː", "When you agree or confirm."),
    "no": ("Nein", "naɪn", "When you refuse or disagree."),
    "excuse me": ("Entschuldigung", "ɛntˈʃʊl.dɪ.ɡʊŋ", "When you need attention or to apologise."),
    "sorry": ("Es tut mir leid", "ɛs tuːt miːɐ laɪt", "When you apologise."),
    "my name is": ("Ich heiße", "ɪç ˈhaɪ.sə", "When you introduce yourself."),
    "what is your name": ("Wie heißt du?", "viː haɪst duː", "When you ask someone's name."),
    "i am from": ("Ich komme aus", "ɪç ˈkɔ.mə aʊs", "When someone asks where you are from."),
    "nice to meet you": ("Freut mich", "fʁɔɪt mɪç", "When you meet someone for the first time."),
    "goodbye": ("Auf Wiedersehen", "aʊf ˈviː.dɐ.zeː.ən", "When you leave a shop, office, or class."),
    "bye": ("Tschüss", "tʃʏs", "A casual goodbye with people you know."),
    "water": ("Wasser", "ˈva.sɐ", "When you order or ask for water."),
    "coffee": ("Kaffee", "ˈka.feː", "When you order coffee."),
    "bread": ("Brot", "bʁoːt", "When you buy or ask for bread."),
    "the bill": ("Die Rechnung", "diː ˈʁɛç.nʊŋ", "When you want to pay in a café or restaurant."),
    "where is": ("Wo ist", "voː ɪst", "When you ask for a place."),
    "left": ("links", "lɪŋks", "When you give or follow directions."),
    "right": ("rechts", "ʁɛçts", "When you give or follow directions."),
    "straight ahead": ("geradeaus", "ɡə.ʁa.dəˈʔaʊs", "When you give directions."),
    "train station": ("Bahnhof", "ˈbaːn.hoːf", "When you ask for or name the station."),
    "ticket": ("Fahrkarte", "ˈfaːɐ.kaʁ.tə", "When you buy a ticket."),
    "i work": ("Ich arbeite", "ɪç aʁˈbaɪ.tə", "When you talk about your job."),
    "i study": ("Ich studiere", "ɪç ʃtuˈdiː.ʁə", "When you talk about university."),
    "student": ("Student", "ʃtuˈdɛnt", "When you say you are a student."),
    "appointment": ("Termin", "tɛʁˈmiːn", "When you book or mention an appointment."),
    "i need help": ("Ich brauche Hilfe", "ɪç ˈbʁaʊ.xə ˈhɪl.fə", "When you need assistance."),
}


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9äöüß ]+", "", (text or "").strip().lower())


def suggest_scene(module_title: str, english: str = "") -> str:
    blob = f"{module_title} {english}".lower()
    if any(w in blob for w in ("work", "job", "office", "visa", "termin", "anmeld", "boss", "interview")):
        return "office"
    if any(w in blob for w in ("campus", "study", "univers", "class", "exam", "school", "student")):
        return "campus"
    if any(w in blob for w in ("town", "street", "station", "ticket", "left", "right", "where", "bus", "train")):
        return "street"
    if any(w in blob for w in ("greet", "hello", "café", "cafe", "coffee", "thanks", "please", "food", "restaurant")):
        return "cafe"
    return "cafe"


def _from_bank(english: str) -> dict[str, str] | None:
    key = _norm(english)
    if key in _BANK:
        de, ipa, usage = _BANK[key]
        return {"target_text": de, "ipa": ipa, "usage_note": usage}
    for stem, row in _BANK.items():
        if key.startswith(stem) or stem.startswith(key):
            de, ipa, usage = row
            return {"target_text": de, "ipa": ipa, "usage_note": usage}
    return None


def _from_gemini(english: str, module_title: str, cefr: str) -> dict[str, str] | None:
    settings = get_settings()
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key:
        return None
    prompt = (
        "You write A1-C1 German classroom lines for adults preparing for life in Germany. "
        "Return JSON only with keys target_text, ipa, usage_note, scene_key. "
        "target_text: one natural German line, no quotes. "
        "ipa: IPA without slashes. "
        "usage_note: one English sentence, adult register, when to say it. "
        "scene_key: one of cafe, office, campus, street. "
        f"CEFR: {cefr or 'A1'}. Module: {module_title or 'German'}. English: {english}"
    )
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.I | re.M).strip()
        data = json.loads(raw)
        german = str(data.get("target_text") or "").strip()
        if not german:
            return None
        scene = str(data.get("scene_key") or "").strip().lower()
        if scene not in SCENE_KEYS:
            scene = suggest_scene(module_title, english)
        return {
            "target_text": german[:512],
            "ipa": str(data.get("ipa") or "").strip()[:128],
            "usage_note": str(data.get("usage_note") or "").strip()[:512],
            "scene_key": scene,
        }
    except Exception:
        log.exception("Classroom generate failed for %s", english[:80])
        return None


def fill_lesson(
    english: str,
    *,
    module_title: str = "",
    cefr: str = "A1",
    target_text: str | None = None,
    ipa: str | None = None,
    usage_note: str | None = None,
) -> dict[str, str]:
    english = (english or "").strip()
    out = {
        "target_text": (target_text or "").strip(),
        "ipa": (ipa or "").strip(),
        "usage_note": (usage_note or "").strip(),
        "scene_key": suggest_scene(module_title, english),
    }
    need = not out["target_text"] or not out["ipa"] or not out["usage_note"]
    if not need:
        return out
    generated = _from_gemini(english, module_title, cefr) or _from_bank(english) or {}
    if not out["target_text"]:
        out["target_text"] = generated.get("target_text") or english
    if not out["ipa"]:
        out["ipa"] = generated.get("ipa") or ""
    if not out["usage_note"]:
        out["usage_note"] = generated.get("usage_note") or "Use this line in everyday German in Germany."
    if generated.get("scene_key") in SCENE_KEYS:
        out["scene_key"] = generated["scene_key"]
    return out
