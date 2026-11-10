from __future__ import annotations

import html
import logging
import re
import threading
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

import httpx
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.classroom_feed import ClassroomComment, ClassroomPost
from app.models.user import User

log = logging.getLogger(__name__)

NEWS_KIND = "news"
MAX_NEWS_POSTS = 24
FETCH_EVERY = timedelta(hours=6)

FEEDS = [
    "https://rss.dw.com/rdf/rss-en-ger",
    "https://www.tagesschau.de/inland/index~rss2.xml",
    "https://news.google.com/rss/search?q=Germany+OR+Deutschland+when:1d&hl=en&gl=DE&ceid=DE:en",
    "https://www.thelocal.de/feed",
]

HUB_PHOTOS = [
    "/classroom/hub/berlin-gate.jpg",
    "/classroom/hub/berlin-offices.jpg",
    "/classroom/hub/university.jpg",
    "/classroom/hub/library.jpg",
    "/classroom/hub/documents.jpg",
    "/classroom/hub/clinic.jpg",
    "/classroom/hub/shops.jpg",
    "/classroom/hub/classroom.jpg",
]

_last_fetch_at: datetime | None = None
_lock = threading.Lock()


def _child(item: ET.Element, *names: str) -> str:
    wanted = set(names)
    for child in item:
        local = child.tag.rsplit("}", 1)[-1]
        if local not in wanted:
            continue
        href = (child.get("href") or child.get("{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource") or "").strip()
        return (child.text or "").strip() or href
    return ""


def _clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _host(url: str) -> str:
    try:
        return urlparse(url).hostname.replace("www.", "") if urlparse(url).hostname else url
    except Exception:
        return url


def _channel(title: str, body: str) -> str:
    text = f"{title} {body}".lower()
    if any(word in text for word in ("job", "work", "visa", "blue card", "ausbildung", "employment", "salary")):
        return "work"
    if any(word in text for word in ("universit", "student", "daad", "school", "study", "scholarship")):
        return "study"
    return "live"


def _photo(index: int, title: str) -> str:
    text = title.lower()
    if any(word in text for word in ("job", "work", "office", "economy")):
        return "/classroom/hub/berlin-offices.jpg"
    if any(word in text for word in ("universit", "student", "school")):
        return "/classroom/hub/university.jpg"
    if any(word in text for word in ("health", "hospital", "covid")):
        return "/classroom/hub/clinic.jpg"
    if any(word in text for word in ("berlin", "brandenburg")):
        return "/classroom/hub/berlin-gate.jpg"
    return HUB_PHOTOS[index % len(HUB_PHOTOS)]


def _parse_items(xml: str) -> list[dict[str, str]]:
    root = ET.fromstring(xml)
    rows: list[dict[str, str]] = []
    atom = "{http://www.w3.org/2005/Atom}"
    rss1 = "{http://purl.org/rss/1.0/}"
    nodes = list(root.findall(".//item")) + list(root.findall(f".//{atom}entry")) + list(root.findall(f".//{rss1}item"))
    for item in nodes:
        title = _clean(_child(item, "title"))
        link = _clean(_child(item, "link"))
        if not link:
            link = (item.get("{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about") or "").strip()
        body = _clean(_child(item, "description", "summary", "content"))
        if not title or not link:
            continue
        blob = f"{title} {link}".lower()
        about_germany = bool(
            re.search(
                r"german|deutschland|berlin|bavaria|bayern|hamburg|köln|cologne|frankfurt|munich|münchen|scholz|merz|bundestag|bundes|aachen|stuttgart|düsseldorf",
                blob,
            )
        )
        from_germany_desk = "dw.com" in link or "thelocal.de" in link
        if not about_germany and not from_germany_desk:
            continue
        rows.append({"title": title[:180], "link": link[:512], "body": body})
    return rows


def _download() -> list[dict[str, str]]:
    found: list[dict[str, str]] = []
    seen: set[str] = set()
    headers = {"User-Agent": "MultivateClassroom/1.0 (germany-hub; +https://multivate.com.ng)"}
    with httpx.Client(timeout=12.0, follow_redirects=True, headers=headers) as client:
        for url in FEEDS:
            try:
                res = client.get(url)
                if res.status_code >= 400 or not res.text:
                    continue
                try:
                    parsed = _parse_items(res.text)
                except ET.ParseError:
                    continue
                for item in parsed:
                    key = item["link"].split("?")[0]
                    if key in seen:
                        continue
                    seen.add(key)
                    found.append(item)
            except Exception as exc:
                log.warning("Germany news feed failed %s: %s", url, exc)
    return found[:40]


def refresh_germany_news(db: Session, *, force: bool = False) -> None:
    global _last_fetch_at
    with _lock:
        now = datetime.now(timezone.utc)
        if not force and _last_fetch_at and now - _last_fetch_at < FETCH_EVERY:
            return
        desk = db.execute(select(User).order_by(User.created_at.asc()).limit(1)).scalar_one_or_none()
        if not desk:
            return
        items = _download()
        _last_fetch_at = now
        if not items:
            return
        existing = list(
            db.execute(select(ClassroomPost).where(ClassroomPost.space == "hub", ClassroomPost.kind == NEWS_KIND)).scalars().all()
        )
        have_links = {row.link_url for row in existing if row.link_url}
        added = 0
        for index, item in enumerate(items):
            if item["link"] in have_links:
                continue
            summary = item["body"][:420] or item["title"]
            db.add(
                ClassroomPost(
                    author_id=desk.id,
                    space="hub",
                    channel=_channel(item["title"], item["body"]),
                    title=item["title"],
                    body=summary,
                    image_url=_photo(index, item["title"]),
                    kind=NEWS_KIND,
                    link_url=item["link"],
                    link_label=_host(item["link"]),
                    detail=item["body"][:1200] or None,
                )
            )
            have_links.add(item["link"])
            added += 1
            if added >= 12:
                break
        db.commit()
        keep = list(
            db.execute(
                select(ClassroomPost)
                .where(ClassroomPost.space == "hub", ClassroomPost.kind == NEWS_KIND)
                .order_by(ClassroomPost.created_at.desc())
            ).scalars().all()
        )
        for row in keep[MAX_NEWS_POSTS:]:
            db.execute(delete(ClassroomComment).where(ClassroomComment.post_id == row.id))
            db.delete(row)
        db.commit()
