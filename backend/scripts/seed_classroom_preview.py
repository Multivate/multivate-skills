"""Add opening lessons to published catalog courses so the classroom can be opened.

Run from backend/:
  .venv/bin/python scripts/seed_classroom_preview.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models.audio_phrase import AudioPhrase  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.course_section import CourseSection  # noqa: E402
from app.models.course_status import CourseFormat, CourseStatus, LessonType  # noqa: E402
from app.models.enrollment import Enrollment  # noqa: E402
from app.models.enrollment_status import EnrollmentStatus  # noqa: E402
from app.models.lesson import Lesson  # noqa: E402
from app.models.user import User  # noqa: E402

LESSONS: dict[str, list[tuple[str, str]]] = {
    "german-for-life-and-work": [
        (
            "How this week fits life in Germany",
            "You are on a structured path toward everyday German. This week: greet people, give your name, and say why you are here. Speak the lines out loud. Stop when your session timer ends.",
        ),
        (
            "Greetings you will actually use",
            "Guten Tag, Hallo, Ich heiße…, Ich komme aus… Practice once slowly, then at normal speed. This is the German you need at the Bürgeramt and at work.",
        ),
        (
            "Check: can you introduce yourself?",
            "Write three sentences: your name, your country, and that you want to work or study in Germany. If you get stuck, ask a mentor from the classroom strip.",
        ),
    ],
    "german-for-work-emails": [
        (
            "Why work German comes after greetings",
            "Emails and forms are how jobs and visas move. This course sits on your path after basic German. Today: subject lines and the polite opening.",
        ),
        (
            "A short email to an employer",
            "Sehr geehrte Damen und Herren, ich bewerbe mich um… Keep it to five lines. Save it in your notes. A mentor can check tone later.",
        ),
        (
            "Forms you will see in Germany",
            "Name, Geburtsdatum, Adresse, Staatsangehörigkeit. Match each German label to English. That is Anmeldung and job paperwork in miniature.",
        ),
    ],
    "career-skills-for-germany": [
        (
            "What German employers listen for",
            "This lesson is on your path toward skilled work. You will practice how you talk about your training, not a generic CV speech.",
        ),
        (
            "Tell your story in two minutes",
            "Who you are, what you can do, why Germany. Time yourself. When the session clock runs out, stop. Come back tomorrow.",
        ),
        (
            "Questions they will ask",
            "Why Germany? When can you start? What is your German level? Write answers, then ask a mentor to hear them.",
        ),
    ],
    "technology-skills-for-germany": [
        (
            "Tech skills that travel to Germany",
            "This is the technology track on your path. Start with tools you can show: files, spreadsheets, and a simple project you can talk about in German and English.",
        ),
        (
            "A small project you can describe",
            "Pick one thing you built or want to build. Write five bullet points. Next week you will say them in German.",
        ),
        (
            "How this week connects to work",
            "German companies hire people who can learn in a structure. Finish this session, mark the week, then ask a mentor what role this points to.",
        ),
    ],
}

AUDIO_MODULES: dict[str, list[tuple[str, list[tuple[str, str]]]]] = {
    "german-for-life-and-work": [
        (
            "Greetings",
            [
                ("Hello", "Hallo"),
                ("Good day", "Guten Tag"),
                ("My name is Ada", "Ich heiße Ada"),
                ("I come from Nigeria", "Ich komme aus Nigeria"),
            ],
        ),
        (
            "Around town",
            [
                ("I would like to register", "Ich möchte mich anmelden"),
                ("Where is the station?", "Wo ist der Bahnhof?"),
                ("I live here", "Ich wohne hier"),
                ("Thank you", "Danke schön"),
            ],
        ),
    ],
}

PHRASES: dict[str, list[tuple[str, str]]] = {
    "german-for-life-and-work": [
        pair for _title, pairs in AUDIO_MODULES["german-for-life-and-work"] for pair in pairs
    ],
    "german-for-work-emails": [
        ("Dear Sir or Madam", "Sehr geehrte Damen und Herren"),
        ("I am applying for this job", "Ich bewerbe mich um diese Stelle"),
        ("Please find my CV attached", "Anbei finden Sie meinen Lebenslauf"),
        ("Thank you for your reply", "Vielen Dank für Ihre Rückmeldung"),
        ("I am available next week", "Ich bin nächste Woche verfügbar"),
        ("Kind regards", "Mit freundlichen Grüßen"),
        ("I look forward to your answer", "Ich freue mich auf Ihre Antwort"),
        ("My German is still improving", "Mein Deutsch wird immer besser"),
    ],
    "career-skills-for-germany": [
        ("I am a skilled worker", "Ich bin Fachkraft"),
        ("I want to work in Germany", "Ich möchte in Deutschland arbeiten"),
        ("I speak English and some German", "Ich spreche Englisch und etwas Deutsch"),
        ("I can start in three months", "Ich kann in drei Monaten anfangen"),
        ("This is my training", "Das ist meine Ausbildung"),
        ("I learned this on the job", "Das habe ich in der Praxis gelernt"),
        ("Do you have questions?", "Haben Sie Fragen?"),
        ("I am motivated", "Ich bin motiviert"),
    ],
    "technology-skills-for-germany": [
        ("This is my project", "Das ist mein Projekt"),
        ("I can use Excel", "Ich kann Excel bedienen"),
        ("I learned this online", "Ich habe das online gelernt"),
        ("I can explain the steps", "Ich kann die Schritte erklären"),
        ("We work as a team", "Wir arbeiten im Team"),
        ("The file is ready", "Die Datei ist fertig"),
        ("I need access", "Ich brauche Zugang"),
        ("It works now", "Es funktioniert jetzt"),
    ],
}


def main() -> None:
    db = SessionLocal()
    try:
        student = db.execute(select(User).where(User.email == "student@multivate.com.ng")).scalar_one_or_none()
        for slug, weeks in LESSONS.items():
            course = db.execute(select(Course).where(Course.slug == slug)).scalar_one_or_none()
            if not course:
                print(f"skip missing course {slug}")
                continue
            course.status = CourseStatus.PUBLISHED
            section = db.execute(
                select(CourseSection).where(CourseSection.course_id == course.id).order_by(CourseSection.position)
            ).scalars().first()
            if section is None:
                section = CourseSection(course_id=course.id, title="Lesson 1", position=1)
                db.add(section)
                db.flush()
            elif section.title.strip().lower() in {"this week", "week 1"}:
                section.title = "Lesson 1"
            existing_titles = {
                row.title
                for row in db.execute(select(Lesson).where(Lesson.course_id == course.id)).scalars()
            }
            position = db.execute(select(Lesson.position).where(Lesson.course_id == course.id)).scalars().all()
            next_pos = max(position, default=0)
            added = 0
            for title, body in weeks:
                if title in existing_titles:
                    continue
                next_pos += 1
                db.add(
                    Lesson(
                        course_id=course.id,
                        section_id=section.id,
                        position=next_pos,
                        title=title,
                        body=body,
                        lesson_type=LessonType.ARTICLE,
                        is_previewable=len(existing_titles) == 0 and added == 0,
                        duration_minutes=12,
                    )
                )
                added += 1
            db.flush()
            total = db.execute(select(Lesson).where(Lesson.course_id == course.id)).scalars().all()
            course.lessons_count = len(total)
            course.duration_minutes = max(course.duration_minutes, len(total) * 12)
            if student:
                enr = db.execute(
                    select(Enrollment).where(Enrollment.user_id == student.id, Enrollment.course_id == course.id)
                ).scalar_one_or_none()
                if enr is None:
                    db.add(
                        Enrollment(
                            user_id=student.id,
                            course_id=course.id,
                            status=EnrollmentStatus.ENROLLED,
                            lesson_done=0,
                            progress_pct=0,
                        )
                    )
                    print(f"enrolled student in {slug}")
                elif enr.status != EnrollmentStatus.ENROLLED:
                    enr.status = EnrollmentStatus.ENROLLED
                    print(f"set enrolled on {slug}")
            print(f"{slug}: {course.lessons_count} lessons (added {added})")
            course.format = CourseFormat.AUDIO
            course.source_language = "en"
            course.target_language = "de"
            audio_modules = AUDIO_MODULES.get(slug)
            if audio_modules:
                sections = list(
                    db.execute(
                        select(CourseSection).where(CourseSection.course_id == course.id).order_by(CourseSection.position)
                    ).scalars()
                )
                while len(sections) < len(audio_modules):
                    next_section = CourseSection(
                        course_id=course.id,
                        title=audio_modules[len(sections)][0],
                        position=len(sections) + 1,
                    )
                    db.add(next_section)
                    db.flush()
                    sections.append(next_section)
                by_pair = {
                    (row.source_text, row.target_text): row
                    for row in db.execute(select(AudioPhrase).where(AudioPhrase.course_id == course.id)).scalars()
                }
                pos = 0
                added_p = 0
                for index, (title, pairs) in enumerate(audio_modules):
                    row_section = sections[index]
                    row_section.title = title
                    row_section.position = index + 1
                    for source, target in pairs:
                        pos += 1
                        existing = by_pair.get((source, target))
                        if existing:
                            existing.section_id = row_section.id
                            existing.position = pos
                            continue
                        phrase = AudioPhrase(
                            course_id=course.id,
                            section_id=row_section.id,
                            position=pos,
                            source_text=source,
                            target_text=target,
                        )
                        db.add(phrase)
                        by_pair[(source, target)] = phrase
                        added_p += 1
                print(f"{slug}: audio modules {len(audio_modules)}, phrases added {added_p}")
            else:
                have = {
                    (row.source_text, row.target_text)
                    for row in db.execute(select(AudioPhrase).where(AudioPhrase.course_id == course.id)).scalars()
                }
                pos = max(
                    db.execute(select(AudioPhrase.position).where(AudioPhrase.course_id == course.id)).scalars().all()
                    or [0]
                )
                added_p = 0
                for source, target in PHRASES.get(slug, []):
                    if (source, target) in have:
                        continue
                    pos += 1
                    db.add(
                        AudioPhrase(
                            course_id=course.id,
                            section_id=section.id,
                            position=pos,
                            source_text=source,
                            target_text=target,
                        )
                    )
                    added_p += 1
                print(f"{slug}: audio phrases added {added_p}")
        db.commit()
        print("done")
    finally:
        db.close()


if __name__ == "__main__":
    main()
