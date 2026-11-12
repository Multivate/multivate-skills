"""German ladder list prices and multi-course bundle percents.

Prices are Naira. Stored as kobo (NGN * 100) on Course.price_cents.
"""

from __future__ import annotations

LADDER_CEFR: dict[str, str] = {
    "german-a1-zero-to-beginner": "A1",
    "german-a1-advanced": "A1",
    "german-a2-beginner": "A2",
    "german-a2-advanced": "A2",
    "german-b1-beginner": "B1",
    "german-b1-advanced": "B1",
    "german-b2-beginner": "B2",
    "german-b2-advanced": "B2",
    "german-c1-beginner": "C1",
    "german-c1-advanced": "C1",
    "german-c2-beginner": "C2",
    "german-c2-advanced": "C2",
}

PRICE_NAIRA: dict[str, int] = {
    "german-a1-zero-to-beginner": 50_000,
    "german-a1-advanced": 52_000,
    "german-a2-beginner": 55_000,
    "german-a2-advanced": 58_000,
    "german-b1-beginner": 62_000,
    "german-b1-advanced": 65_000,
    "german-b2-beginner": 68_000,
    "german-b2-advanced": 70_000,
    "german-c1-beginner": 73_000,
    "german-c1-advanced": 76_000,
    "german-c2-beginner": 78_000,
    "german-c2-advanced": 80_000,
}

# Highest matching path wins.
_PATHS: tuple[tuple[frozenset[str], int, str], ...] = (
    (frozenset({"A1", "A2", "B1", "B2", "C1", "C2"}), 20, "A1 to C2"),
    (frozenset({"A1", "A2", "B1", "B2", "C1"}), 18, "A1 to C1"),
    (frozenset({"A1", "A2", "B1", "B2"}), 15, "A1 to B2"),
    (frozenset({"A1", "A2", "B1"}), 12, "A1 to B1"),
    (frozenset({"A1", "A2"}), 10, "A1 to A2"),
)

LEVEL_NAIRA = {"beginner": 55_000, "intermediate": 75_000, "advanced": 95_000}


def is_hidden_public_title(title: str, slug: str) -> bool:
    blob = f"{title} {slug}".lower()
    return "1:1" in blob or "1-1" in blob


def price_naira_for(slug: str, level: str | None = None) -> int:
    if slug in PRICE_NAIRA:
        return PRICE_NAIRA[slug]
    key = (level or "beginner").lower()
    return LEVEL_NAIRA.get(key, 55_000)


def price_cents_for(slug: str, level: str | None = None) -> int:
    return price_naira_for(slug, level) * 100


def catalog_sort_key(slug: str, title: str) -> tuple[int, str]:
    order = list(LADDER_CEFR.keys())
    if slug in LADDER_CEFR:
        return (order.index(slug), title.lower())
    return (1000, title.lower())


def bundle_quote(slugs: list[str]) -> dict:
    seen: list[str] = []
    for slug in slugs:
        key = (slug or "").strip()
        if key and key not in seen:
            seen.append(key)
    if len(seen) < 2:
        return {"percent": 0, "label": "", "count": len(seen)}
    cefr_list = [LADDER_CEFR[slug] for slug in seen if slug in LADDER_CEFR]
    cefrs = set(cefr_list)
    for needed, pct, lab in _PATHS:
        if needed.issubset(cefrs):
            return {"percent": pct, "label": lab, "count": len(seen)}
    if len(seen) == 2 and len(cefr_list) == 2 and cefr_list[0] == cefr_list[1]:
        level = cefr_list[0]
        return {"percent": 8, "label": f"{level} to {level} Advanced", "count": 2}
    return {"percent": 10, "label": "2 or more courses", "count": len(seen)}


def apply_bundle_cents(amount_cents: int, slugs: list[str], course_slug: str) -> tuple[int, int, str]:
    keys = [course_slug, *slugs]
    quote = bundle_quote(keys)
    percent = int(quote["percent"])
    if percent <= 0 or course_slug not in {s.strip() for s in keys if s}:
        return amount_cents, 0, ""
    payable = max(0, round(amount_cents * (100 - percent) / 100))
    return payable, max(0, amount_cents - payable), str(quote["label"])
