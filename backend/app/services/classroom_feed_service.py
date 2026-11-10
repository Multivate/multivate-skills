from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.classroom_feed import ClassroomComment, ClassroomPost, ClassroomVoicePresence
from app.models.student_learning_profile import StudentLearningProfile
from app.models.user import User
from app.schemas.classroom_feed import (
    ClassroomAuthorOut,
    ClassroomCommentIn,
    ClassroomCommentOut,
    ClassroomPostIn,
    ClassroomPostOut,
    ClassroomVoiceMemberOut,
)
from app.services.learning_intent import intent_from_profile, normalize_goal
from app.services.germany_news_service import NEWS_KIND, refresh_germany_news

ALLOWED_CHANNELS = {
    "hub": {"all", "for-you", "following", "germany", "study", "work", "live", "campus", "train", "general"},
    "community": {"general", "german", "campus", "help", "jobs"},
}

VOICE_ROOMS = {"lounge", "german-hour", "office"}

GERMANY_POSTS = [
    {
        "channel": "work",
        "title": "EU Blue Card for skilled work",
        "body": "The EU Blue Card is the main residence title for university-trained specialists working in Germany. Salary thresholds and the job must match your qualification. Check current rules on the official Make it in Germany portal.",
        "detail": "Make it in Germany is the Federal Government portal for skilled workers. It explains who qualifies, the salary floor, family reunion, and settlement after 27 or 21 months with German language.",
        "link_url": "https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card",
        "link_label": "make-it-in-germany.com",
        "image_url": "/classroom/hub/berlin-gate.jpg",
    },
    {
        "channel": "work",
        "title": "Find jobs on the Federal Employment Agency board",
        "body": "The Bundesagentur für Arbeit runs the official job board for Germany. Search in English, filter by city, and read visa notes on each posting.",
        "detail": "This is the public employment service, not a private recruiter. Create a profile, upload a CV, and apply to roles that state they will sponsor a work visa or Blue Card.",
        "link_url": "https://www.arbeitsagentur.de/en/job-board",
        "link_label": "arbeitsagentur.de",
        "image_url": "/classroom/hub/berlin-offices.jpg",
    },
    {
        "channel": "work",
        "title": "Ausbildung: paid vocational training",
        "body": "Ausbildung is a dual training contract: you work at a company and study at a vocational school. You earn a training wage. Many tracks ask for B1 German.",
        "detail": "Official overview of vocational training for international applicants, including how companies hire and how the visa for vocational training works.",
        "link_url": "https://www.make-it-in-germany.com/en/study-vocational-training/training-in-germany",
        "link_label": "make-it-in-germany.com",
        "image_url": "/classroom/hub/workshop.jpg",
    },
    {
        "channel": "study",
        "title": "Study in Germany via DAAD",
        "body": "DAAD is the German Academic Exchange Service. Use it for degree search, scholarships, and how public universities work. Most bachelor programmes at public unis are still German-taught.",
        "detail": "Start with DAAD’s Study in Germany pages, then check each university’s own site for deadlines. Hochschulstart and uni-assist handle many applications.",
        "link_url": "https://www.daad.de/en/studying-in-germany/universities/all-about-studying-in-germany/",
        "link_label": "daad.de",
        "image_url": "/classroom/hub/university.jpg",
    },
    {
        "channel": "study",
        "title": "uni-assist processes many international applications",
        "body": "uni-assist checks foreign school and university certificates for hundreds of German universities. Deadlines are strict. You apply through their portal, then often again at the university.",
        "detail": "Create an account, upload certified copies, and pay the handling fee. Not every university uses uni-assist. DAAD and the university site will say which route you need.",
        "link_url": "https://www.uni-assist.de/en/",
        "link_label": "uni-assist.de",
        "image_url": "/classroom/hub/library.jpg",
    },
    {
        "channel": "live",
        "title": "Register your address (Anmeldung)",
        "body": "After you move in, you must register at the local registration office (Bürgeramt / Einwohnermeldeamt). In most states this is required within two weeks. You need your passport and a landlord confirmation (Wohnungsgeberbestätigung).",
        "detail": "Berlin’s service page is the clearest public example. Other cities use the same law with local booking systems. Anmeldung is usually required before you can open some bank products, get a tax ID, or finish health insurance letters.",
        "link_url": "https://service.berlin.de/dienstleistung/120686/",
        "link_label": "service.berlin.de",
        "image_url": "/classroom/hub/documents.jpg",
    },
    {
        "channel": "live",
        "title": "Health insurance is mandatory",
        "body": "Everyone living in Germany must have health insurance. Employees usually join a public insurer (gesetzliche Krankenversicherung). Students and self-employed people have extra rules.",
        "detail": "The Federal Government explains public vs private insurance, what is covered, and that you cannot skip coverage. Bring proof of insurance to Anmeldung, university enrolment, and visa offices.",
        "link_url": "https://www.make-it-in-germany.com/en/living-in-germany/provision/health-insurance",
        "link_label": "make-it-in-germany.com",
        "image_url": "/classroom/hub/clinic.jpg",
    },
    {
        "channel": "live",
        "title": "Culture: most shops close on Sunday",
        "body": "Under the shop-closing laws (Ladenschluss), regular retail is closed on Sundays and public holidays. Bakeries often have a short Sunday morning window. Plan groceries on Saturday.",
        "detail": "This is national practice with small local exceptions (stations, petrol, some tourist areas). It is not a supermarket strike. Pharmacies rotate emergency duty (Notdienst).",
        "link_url": "https://www.make-it-in-germany.com/en/living-in-germany/everyday-life",
        "link_label": "make-it-in-germany.com",
        "image_url": "/classroom/hub/shops.jpg",
    },
    {
        "channel": "live",
        "title": "Culture: Pfand, recycling, and quiet hours",
        "body": "Many bottles carry a deposit (Pfand). Return them to the supermarket machine. Paper, plastic (Gelber Sack / Gelbe Tonne), glass, and residual waste are separated. Quiet hours (Ruhezeit) usually cover nights and Sunday: keep music and drills down.",
        "detail": "Pfand and packaging recycling are federal systems. Exact bin colours and Ruhezeit hours are set by your city and building rules. Neighbours will enforce Sunday quiet more strictly than weekday evenings.",
        "link_url": "https://www.make-it-in-germany.com/en/living-in-germany/everyday-life",
        "link_label": "make-it-in-germany.com",
        "image_url": "/classroom/hub/recycling.jpg",
    },
    {
        "channel": "study",
        "title": "BAMF integration and German courses",
        "body": "The Federal Office for Migration and Refugees (BAMF) funds integration courses: German plus an orientation course on law, culture, and history. Check if you are eligible and where to sit the placement test.",
        "detail": "Integration courses are the official path to B1 for many residence titles. The BAMF site lists providers. Private Goethe and telc exams remain valid for university and visa files.",
        "link_url": "https://www.bamf.de/EN/Themen/Integration/ZugewanderteTeilnehmende/Integrationskurse/integrationskurse-node.html",
        "link_label": "bamf.de",
        "image_url": "/classroom/hub/classroom.jpg",
    },
    {
        "channel": "work",
        "title": "Get a foreign qualification recognised",
        "body": "If you trained as a nurse, teacher, engineer, or in a regulated trade, Germany may require recognition (Anerkennung) before you can work in that profession.",
        "detail": "Anerkennung in Deutschland is the official portal. It tells you whether your job is regulated, which authority decides, and which documents to submit.",
        "link_url": "https://www.anerkennung-in-deutschland.de/html/en/",
        "link_label": "anerkennung-in-deutschland.de",
        "image_url": "/classroom/hub/certificates.jpg",
    },
]


def _author(user: User, *, desk: bool = False) -> ClassroomAuthorOut:
    return ClassroomAuthorOut(
        id=user.id,
        name="Germany Desk" if desk else user.name,
        avatar_url=None if desk else user.avatar_url,
    )


def _comment_count(db: Session, post_id: UUID) -> int:
    return int(db.execute(select(func.count()).select_from(ClassroomComment).where(ClassroomComment.post_id == post_id)).scalar() or 0)


def _serialize(db: Session, row: ClassroomPost, *, with_comments: bool = False) -> ClassroomPostOut:
    author = db.execute(select(User).where(User.id == row.author_id)).scalar_one()
    comments: list[ClassroomCommentOut] = []
    if with_comments:
        items = (
            db.execute(select(ClassroomComment).where(ClassroomComment.post_id == row.id).order_by(ClassroomComment.created_at.asc()))
            .scalars()
            .all()
        )
        for item in items:
            person = db.execute(select(User).where(User.id == item.author_id)).scalar_one()
            comments.append(
                ClassroomCommentOut(id=item.id, body=item.body, created_at=item.created_at, author=_author(person))
            )
    return ClassroomPostOut(
        id=row.id,
        space=row.space,
        channel=row.channel,
        title=row.title,
        body=row.body,
        image_url=row.image_url,
        kind=row.kind,
        link_url=row.link_url,
        link_label=row.link_label,
        detail=row.detail,
        created_at=row.created_at,
        author=_author(author, desk=row.kind in {"germany", NEWS_KIND}),
        comment_count=_comment_count(db, row.id),
        comments=comments,
    )


def _user_goal(db: Session, user: User) -> str:
    profile = db.execute(select(StudentLearningProfile).where(StudentLearningProfile.user_id == user.id)).scalar_one_or_none()
    if profile:
        return intent_from_profile(profile, learn_with=getattr(user, "learn_with", None)).goal
    topic = (getattr(user, "learn_topic", None) or "").lower()
    if "work" in topic or "job" in topic:
        return "work"
    if "stud" in topic or "uni" in topic:
        return "study"
    return normalize_goal(None)


def _ensure_germany_posts(db: Session) -> None:
    desk = db.execute(select(User).order_by(User.created_at.asc()).limit(1)).scalar_one_or_none()
    if not desk:
        return
    old = db.execute(select(ClassroomPost).where(ClassroomPost.space == "hub", ClassroomPost.kind == "germany")).scalars().all()
    have = {row.title: row for row in old if row.title}
    wanted = {item["title"] for item in GERMANY_POSTS}
    for row in old:
        if row.title not in wanted:
            db.execute(delete(ClassroomComment).where(ClassroomComment.post_id == row.id))
            db.delete(row)
    for item in GERMANY_POSTS:
        row = have.get(item["title"])
        if row:
            row.body = item["body"]
            row.channel = item["channel"]
            row.image_url = item["image_url"]
            row.link_url = item["link_url"]
            row.link_label = item["link_label"]
            row.detail = item["detail"]
            continue
        db.add(
            ClassroomPost(
                author_id=desk.id,
                space="hub",
                channel=item["channel"],
                title=item["title"],
                body=item["body"],
                image_url=item["image_url"],
                kind="germany",
                link_url=item["link_url"],
                link_label=item["link_label"],
                detail=item["detail"],
            )
        )
    db.commit()


def _score(row: ClassroomPost, goal: str, now: datetime) -> float:
    created = row.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_hours = max(0.2, (now - created).total_seconds() / 3600)
    recency = 48 / age_hours
    match = 10 if row.channel == goal or (goal == "train" and row.channel == "work") else 0
    germany = 6 if row.kind == "germany" else 8 if row.kind == NEWS_KIND else 0
    photo = 3 if row.image_url else 0
    return recency + match + germany + photo


def list_posts(db: Session, space: str, channel: str | None, user: User) -> list[ClassroomPostOut]:
    if space not in ALLOWED_CHANNELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown space")
    if space == "hub":
        _ensure_germany_posts(db)
        try:
            refresh_germany_news(db)
        except Exception:
            pass
    stmt = select(ClassroomPost).where(ClassroomPost.space == space)
    wanted = (channel or "for-you").strip()
    if wanted == "germany":
        stmt = stmt.where(ClassroomPost.kind.in_(("germany", NEWS_KIND)))
    elif wanted == "following":
        stmt = stmt.where(ClassroomPost.kind == "student")
    elif wanted not in {"all", "for-you", ""}:
        stmt = stmt.where(ClassroomPost.channel == wanted)
    rows = list(db.execute(stmt).scalars().all())
    goal = _user_goal(db, user)
    now = datetime.now(timezone.utc)
    if space == "hub" and wanted in {"", "all", "for-you", "germany"}:
        rows.sort(key=lambda row: _score(row, goal, now), reverse=True)
    else:
        rows.sort(key=lambda row: row.created_at, reverse=True)
    return [_serialize(db, row, with_comments=space == "hub") for row in rows]


def create_post(db: Session, user: User, payload: ClassroomPostIn) -> ClassroomPostOut:
    channels = ALLOWED_CHANNELS.get(payload.space)
    if not channels:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown space")
    channel = (payload.channel or "general").strip().lstrip("#").lower()
    if channel not in channels or channel in {"all", "for-you", "germany"}:
        channel = "study" if payload.space == "hub" else "general"
    body = (payload.body or "").strip()
    image = (payload.image_url or "").strip() or None
    if not body and not image:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Write something or add a photo.")
    title = payload.title.strip() if payload.title else None
    if payload.space == "hub" and not title:
        title = (body or "Photo")[:80]
    row = ClassroomPost(
        author_id=user.id,
        space=payload.space,
        channel=channel,
        title=title,
        body=body or "",
        image_url=image,
        kind="student",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(db, row, with_comments=True)


def add_comment(db: Session, user: User, post_id: UUID, payload: ClassroomCommentIn) -> ClassroomCommentOut:
    post = db.execute(select(ClassroomPost).where(ClassroomPost.id == post_id)).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    row = ClassroomComment(post_id=post.id, author_id=user.id, body=payload.body.strip())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ClassroomCommentOut(id=row.id, body=row.body, created_at=row.created_at, author=_author(user))


def _purge_stale_voice(db: Session) -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=25)
    db.execute(delete(ClassroomVoicePresence).where(ClassroomVoicePresence.heartbeat_at < cutoff))
    db.commit()


def list_voice(db: Session, room: str | None) -> list[ClassroomVoiceMemberOut]:
    _purge_stale_voice(db)
    stmt = select(ClassroomVoicePresence)
    if room:
        stmt = stmt.where(ClassroomVoicePresence.room == room)
    rows = db.execute(stmt).scalars().all()
    out: list[ClassroomVoiceMemberOut] = []
    for row in rows:
        person = db.execute(select(User).where(User.id == row.user_id)).scalar_one()
        out.append(ClassroomVoiceMemberOut(id=person.id, name=person.name, room=row.room))
    return out


def voice_action(db: Session, user: User, room: str, action: str) -> list[ClassroomVoiceMemberOut]:
    room = room.strip().lower()
    if room not in VOICE_ROOMS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown voice room")
    existing = db.execute(select(ClassroomVoicePresence).where(ClassroomVoicePresence.user_id == user.id)).scalar_one_or_none()
    if action == "leave":
        if existing:
            db.delete(existing)
            db.commit()
        return list_voice(db, room)
    now = datetime.now(timezone.utc)
    if existing:
        existing.room = room
        existing.heartbeat_at = now
        if action == "join":
            existing.joined_at = now
    else:
        db.add(ClassroomVoicePresence(user_id=user.id, room=room, joined_at=now, heartbeat_at=now))
    db.commit()
    return list_voice(db, room)
