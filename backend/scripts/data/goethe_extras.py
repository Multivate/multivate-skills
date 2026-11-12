"""Goethe-aligned extra lessons for A1 Advanced through B2 Advanced.

Each pack has 16 lists matching MODULES order. Phrases are unique within a pack
and written for that CEFR band (A1 survival, A2 everyday narrative, B1 opinion
and work, B2 argument and register). Seed merges these onto the base modules.
"""

from __future__ import annotations

from extras_a1_advanced import EXTRAS as _A1A
from extras_a2_beginner import EXTRAS as _A2B
from extras_a2_advanced import EXTRAS as _A2A
from extras_b1_beginner import EXTRAS as _B1B
from extras_b1_advanced import EXTRAS as _B1A
from extras_b2_beginner import EXTRAS as _B2B
from extras_b2_advanced import EXTRAS as _B2A

PACKS: dict[str, list[list[tuple[str, str, str]]]] = {
    "german_a1_advanced": _A1A,
    "german_a2_beginner": _A2B,
    "german_a2_advanced": _A2A,
    "german_b1_beginner": _B1B,
    "german_b1_advanced": _B1A,
    "german_b2_beginner": _B2B,
    "german_b2_advanced": _B2A,
}


def extra_for(pack: str) -> list[list[tuple[str, str, str]]]:
    rows = PACKS.get(pack)
    if rows is None:
        return [[] for _ in range(16)]
    if len(rows) != 16:
        raise SystemExit(f"{pack} extras must have 16 modules, has {len(rows)}")
    return rows


def merge_modules(pack: str, modules: list) -> list:
    extras = extra_for(pack)
    merged = []
    seen_en: set[str] = set()
    seen_de: set[str] = set()
    for (title, scene, phrases), extra in zip(modules, extras, strict=True):
        combined = []
        for source, target, usage in list(phrases) + list(extra):
            en = source.strip().lower()
            de = target.strip().lower()
            if en in seen_en or de in seen_de:
                continue
            seen_en.add(en)
            seen_de.add(de)
            combined.append((source.strip(), target.strip(), usage.strip()))
        if len(combined) < 38:
            raise SystemExit(f"{pack} module {title!r} has only {len(combined)} unique lessons (need 38+)")
        merged.append((title, scene, combined))
    return merged
