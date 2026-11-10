"""Render German course covers using the real Multivate white logo file."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "frontend" / "public"
OUT = PUBLIC / "marketing"
LOGO_PATH = PUBLIC / "MULTIVATE LOGO WHITE.png"

W, H = 1280, 720
INK = (16, 36, 79)
ACCENT = (20, 87, 208)
WHITE = (255, 255, 255)
MUTED = (168, 180, 200)
GOLD = (212, 168, 75)
GOLD_DIM = (184, 148, 72)

COURSES = [
    {
        "file": "german-a1-cover.jpg",
        "level": "A1",
        "band": "ZERO TO BEGINNER",
        "quote": "Start speaking German with confidence.",
        "modules": "16 Structured Learning Modules",
        "activities": "712 Learning and Practice Activities",
        "exam": "A1 Examination Preparation",
        "badge": "CEFR A1  |  ABSOLUTE BEGINNER",
    },
    {
        "file": "german-a1-advanced-cover.jpg",
        "level": "A1",
        "band": "ADVANCED",
        "quote": "More A1 situations, grammar in use, and exam tasks.",
        "modules": "16 Structured Learning Modules",
        "activities": "448 Learning and Practice Activities",
        "exam": "A1 Examination Preparation",
        "badge": "CEFR A1  |  A1 ADVANCED",
    },
    {
        "file": "german-a2-beginner-cover.jpg",
        "level": "A2",
        "band": "BEGINNER",
        "quote": "Past events, reasons, plans, and A2 exam skills.",
        "modules": "16 Structured Learning Modules",
        "activities": "448 Learning and Practice Activities",
        "exam": "A2 Examination Preparation",
        "badge": "CEFR A2  |  A2 BEGINNER",
    },
    {
        "file": "german-a2-advanced-cover.jpg",
        "level": "A2",
        "band": "ADVANCED",
        "quote": "Reflexive verbs, adjective endings, and A2 exam polish.",
        "modules": "16 Structured Learning Modules",
        "activities": "448 Learning and Practice Activities",
        "exam": "A2 Examination Preparation",
        "badge": "CEFR A2  |  A2 ADVANCED",
    },
    {
        "file": "german-b1-beginner-cover.jpg",
        "level": "B1",
        "band": "BEGINNER",
        "quote": "Opinions, work language, connectors, and B1 exam tasks.",
        "modules": "16 Structured Learning Modules",
        "activities": "448 Learning and Practice Activities",
        "exam": "B1 Examination Preparation",
        "badge": "CEFR B1  |  B1 BEGINNER",
    },
    {
        "file": "german-b1-advanced-cover.jpg",
        "level": "B1",
        "band": "ADVANCED",
        "quote": "Passive, relative clauses, official language, and the B1 paper.",
        "modules": "16 Structured Learning Modules",
        "activities": "448 Learning and Practice Activities",
        "exam": "B1 Examination Preparation",
        "badge": "CEFR B1  |  B1 ADVANCED",
    },
    {
        "file": "german-b2-beginner-cover.jpg",
        "level": "B2",
        "band": "BEGINNER",
        "quote": "Register, argument, sources, and first B2 exam genres.",
        "modules": "16 Structured Learning Modules",
        "activities": "448 Learning and Practice Activities",
        "exam": "B2 Examination Preparation",
        "badge": "CEFR B2  |  B2 BEGINNER",
    },
    {
        "file": "german-b2-advanced-cover.jpg",
        "level": "B2",
        "band": "ADVANCED",
        "quote": "Style, debate, official language, and full B2 exam method.",
        "modules": "16 Structured Learning Modules",
        "activities": "448 Learning and Practice Activities",
        "exam": "B2 Examination Preparation",
        "badge": "CEFR B2  |  B2 ADVANCED",
    },
]


def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def fonts() -> dict[str, ImageFont.FreeTypeFont]:
    bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    regular = "/System/Library/Fonts/Supplemental/Arial.ttf"
    italic = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"
    if not Path(italic).exists():
        italic = regular
    return {
        "logo_gap": _font(regular, 12),
        "kicker": _font(bold, 15),
        "title": _font(bold, 64),
        "level": _font(bold, 64),
        "band": _font(bold, 52),
        "quote": _font(italic, 22),
        "stat": _font(regular, 20),
        "badge": _font(bold, 14),
    }


def background() -> Image.Image:
    yy, xx = np.mgrid[0:H, 0:W]
    ink = np.array(INK, dtype=np.float32)
    accent = np.array(ACCENT, dtype=np.float32)
    r1 = np.sqrt((xx - 1020) ** 2 + (yy - 220) ** 2)
    r2 = np.sqrt((xx - 180) ** 2 + (yy - 620) ** 2)
    t1 = np.clip(1 - r1 / 780, 0, 1)[..., None]
    t2 = np.clip(1 - r2 / 520, 0, 1)[..., None] * 0.18
    arr = ink + (accent - ink) * (t1 * 0.42 + t2)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def real_logo() -> Image.Image:
    logo = Image.open(LOGO_PATH).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    h = 128
    w = int(logo.width * (h / logo.height))
    return logo.resize((w, h), Image.Resampling.LANCZOS)


def german_flag() -> Image.Image:
    flag = Image.new("RGB", (54, 36), (0, 0, 0))
    draw = ImageDraw.Draw(flag)
    draw.rectangle([0, 12, 54, 24], fill=(221, 0, 0))
    draw.rectangle([0, 24, 54, 36], fill=(255, 206, 0))
    return flag


def draw_icon(draw: ImageDraw.ImageDraw, kind: str, x: int, y: int) -> None:
    if kind == "modules":
        draw.rounded_rectangle([x, y, x + 22, y + 16], 2, outline=WHITE, width=2)
        draw.line([x + 6, y, x + 6, y + 16], fill=WHITE, width=2)
        draw.line([x, y + 8, x + 22, y + 8], fill=WHITE, width=1)
    elif kind == "puzzle":
        draw.rounded_rectangle([x, y + 2, x + 20, y + 18], 3, outline=WHITE, width=2)
        draw.ellipse([x + 14, y, x + 24, y + 10], outline=WHITE, width=2)
    elif kind == "mic":
        draw.rounded_rectangle([x + 6, y, x + 16, y + 14], 6, outline=WHITE, width=2)
        draw.arc([x + 2, y + 8, x + 20, y + 22], 0, 180, fill=WHITE, width=2)
        draw.line([x + 11, y + 22, x + 11, y + 26], fill=WHITE, width=2)
    elif kind == "book":
        draw.polygon([(x, y + 4), (x + 10, y), (x + 10, y + 16), (x, y + 20)], outline=WHITE)
        draw.polygon([(x + 10, y), (x + 20, y + 4), (x + 20, y + 20), (x + 10, y + 16)], outline=WHITE)
    elif kind == "cap":
        draw.polygon([(x, y + 10), (x + 12, y), (x + 24, y + 10), (x + 12, y + 8)], outline=WHITE)
        draw.line([x + 12, y + 8, x + 12, y + 18], fill=WHITE, width=2)


def render(course: dict) -> None:
    img = background().convert("RGBA")
    draw = ImageDraw.Draw(img)
    f = fonts()

    logo = real_logo()
    img.paste(logo, (48, 24), logo)
    img.paste(german_flag(), (1178, 42))

    draw.text((52, 168), "GERMAN LANGUAGE PROGRAMME", font=f["kicker"], fill=MUTED)

    title_y = 198
    german = "GERMAN  "
    draw.text((48, title_y), german, font=f["title"], fill=WHITE)
    gx = 48 + draw.textlength(german, font=f["title"])
    draw.text((gx, title_y), course["level"], font=f["level"], fill=GOLD)
    draw.text((48, 278), course["band"], font=f["band"], fill=WHITE)
    draw.text((52, 348), f"“{course['quote']}”", font=f["quote"], fill=MUTED)

    left = [
        ("modules", course["modules"]),
        ("puzzle", course["activities"]),
        ("mic", "Interactive Speaking Practice"),
    ]
    right = [
        ("book", "Listening, Reading and Writing"),
        ("cap", course["exam"]),
    ]
    y = 430
    for kind, label in left:
        draw_icon(draw, kind, 52, y)
        draw.text((88, y - 2), label, font=f["stat"], fill=WHITE)
        y += 48
    y = 430
    for kind, label in right:
        draw_icon(draw, kind, 700, y)
        draw.text((736, y - 2), label, font=f["stat"], fill=WHITE)
        y += 48

    badge = course["badge"]
    bw = draw.textlength(badge, font=f["badge"]) + 48
    bx1, by1, bx2, by2 = 700, 548, 700 + bw, 592
    draw.rounded_rectangle([bx1, by1, bx2, by2], 20, outline=GOLD_DIM, width=2)
    draw.ellipse([bx1 + 14, by1 + 14, bx1 + 28, by1 + 30], outline=GOLD, width=2)
    draw.text((bx1 + 38, by1 + 12), badge, font=f["badge"], fill=GOLD)

    rgb = img.convert("RGB")
    dest = OUT / course["file"]
    rgb.save(dest, "JPEG", quality=94, optimize=True)
    print(dest.name, dest.stat().st_size)


def main() -> None:
    if not LOGO_PATH.is_file():
        raise SystemExit(f"Missing logo: {LOGO_PATH}")
    OUT.mkdir(parents=True, exist_ok=True)
    for course in COURSES:
        render(course)


if __name__ == "__main__":
    main()
