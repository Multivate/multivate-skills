"use client";

import {
  Check,
  ChevronLeft,
  GraduationCap,
  Headphones,
  Home,
  Lightbulb,
  Lock,
  MessageCircle,
  Mic,
  Settings,
  Target,
  Trophy,
  Type,
  Users,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/layout/LogoMark";
import { Link } from "@/i18n/navigation";
import { phraseIpa, phraseTips, phraseUsage, spellLetters } from "@/lib/classroom-copy";
import {
  loadLook,
  loadPracticeDays,
  loadTeacherVoice,
  markPracticeToday,
  partnerKid,
  saveLook,
  saveTeacherVoice,
  sceneSrc,
  speakGerman,
  studentKid,
  type StudentLook,
  type TeacherVoice,
} from "@/lib/classroom-prefs";
import { useClassroomVoice } from "@/hooks/useClassroomVoice";
import { getCurrentUser } from "@/services/auth";
import {
  ClassroomCommunity,
  ClassroomOpportunityHub,
  ClassroomProgress,
  ClassroomSettings,
} from "@/components/player/classroom-panels";
import { AppearanceMenu } from "@/components/theme/AppearanceMenu";
import {
  ClassroomAssessment,
  classroomXp,
  type AssessmentRecord,
} from "@/components/player/classroom-assessment";

type Phrase = {
  id: string;
  section_id: string | null;
  position?: number;
  source_text: string;
  target_text: string;
  usage_note?: string | null;
  ipa?: string | null;
  audio_url: string | null;
};

type Section = { id: string; title: string; position: number; scene_key?: string | null };

type Phrasebook = {
  course_slug: string;
  course_title: string;
  cefr_level?: string;
  phrases: Phrase[];
  sections: Section[];
  learned_phrase_ids?: string[];
  progress_pct?: number;
  module_assessments?: { module_key: string; score_pct: number; passed: boolean; at: string }[];
};

type View = "classroom" | "assessment" | "hub" | "progress" | "community" | "settings" | "scenario";
type LearnTab = "listen" | "pronounce" | "spelling" | "usage";
type ChatMsg = { id: string; who: "them" | "me"; text: string; audioUrl?: string | null };

function Kid({
  src,
  talking,
  className,
  bubble,
  stack,
  small,
  onSpeak,
}: {
  src: string;
  talking?: boolean;
  className?: string;
  bubble?: string | null;
  stack?: boolean;
  small?: boolean;
  onSpeak?: () => void;
}) {
  const say = bubble ? (
    <span className={`cr-say ${stack ? "cr-say-up" : ""} ${small ? "cr-say-sm" : ""}`}>
      <LogoMark size="sm" variant="color" />
      <span>
        {bubble.split("! ").length > 1 ? (
          <>
            {bubble.split("! ")[0]}!<br />
            {bubble.split("! ").slice(1).join("! ")}
          </>
        ) : (
          bubble
        )}
        {onSpeak ? (
          <button type="button" className="ml-1 align-middle text-[#1457D0]" aria-label="Play line" onClick={onSpeak}>
            <Volume2 className="inline h-3.5 w-3.5" />
          </button>
        ) : null}
      </span>
    </span>
  ) : null;
  return (
    <span className={`inline-flex max-w-full ${stack ? "flex-col items-center" : "items-end"} gap-2`}>
      {stack ? say : null}
      <img src={src} alt="" className={`${talking ? "cr-kid-talk" : "cr-kid"} shrink-0 select-none ${className ?? ""}`} />
      {!stack ? say : null}
    </span>
  );
}

function Waveform({ active }: { active: boolean }) {
  return (
    <div className={`cr-wave flex h-8 items-end gap-1 ${active ? "text-white" : "text-white/50"}`}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          style={{
            height: `${10 + (i % 4) * 6}px`,
            animationDelay: `${i * 80}ms`,
            animationPlayState: active ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sceneOpening(line: Phrase) {
  const t = line.target_text;
  if (/hallo/i.test(t)) return "Hallo! Wie geht es dir?";
  if (/guten tag/i.test(t)) return "Guten Tag! Wie heißen Sie?";
  if (/heiße|heisse|name/i.test(t)) return "Freut mich. Wie heißen Sie?";
  return t;
}

function sceneFollowUps(current: Phrase, all: Phrase[]) {
  return all.filter((row) => row.id !== current.id).map((row) => row.target_text);
}

function sceneReply(userText: string, used: Set<string>, followUps: string[]) {
  const n = normalize(userText);
  const unused = (text: string) => (used.has(normalize(text)) ? null : text);
  if (/auf wiedersehen|tschuss|tschüss|ciao/.test(n)) return unused("Auf Wiedersehen! Bis bald.");
  if (/danke/.test(n)) return unused("Bitte schön!");
  if (/bitte/.test(n)) return unused("Gern geschehen.");
  if (/mir geht|sehr gut|es geht|ganz gut/.test(n)) return unused("Das freut mich. Wie heißen Sie?");
  if (/ich heisse|ich heiße|mein name/.test(n)) return unused("Freut mich. Woher kommen Sie?");
  if (/ich komme|aus /.test(n)) return unused("Interessant. Wohnen Sie hier?");
  if (/ich wohne|hier/.test(n)) return unused("Gut. Wo ist der Bahnhof?");
  if (/bahnhof|wo ist/.test(n)) return unused("Der Bahnhof ist dort drüben.");
  if (/anmeld/.test(n)) return unused("Sehr gut. Gehen wir zum Bürgeramt.");
  if (/hallo|guten tag|guten morgen/.test(n)) return unused("Hallo! Wie geht es Ihnen heute?");
  if (/\bja\b/.test(n)) return unused("Sehr gut. Erzählen Sie bitte weiter.");
  if (/\bnein\b/.test(n)) return unused("Kein Problem. Versuchen wir einen anderen Satz.");
  const nextLine = followUps.find((line) => !used.has(normalize(line)));
  if (nextLine) return nextLine;
  return unused("Gut gemacht. Schreiben Sie weiter, oder öffnen Sie die nächste Lektion.");
}

export function SkillClassroom({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const [book, setBook] = useState<Phrasebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("classroom");
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [phraseId, setPhraseId] = useState<string | null>(null);
  const [tab, setTab] = useState<LearnTab>("listen");
  const [navOpen, setNavOpen] = useState(false);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [assessments, setAssessments] = useState<Record<string, AssessmentRecord>>({});
  const [draft, setDraft] = useState("");
  const [verdict, setVerdict] = useState<"ok" | "bad" | null>(null);
  const [talking, setTalking] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [look, setLook] = useState<StudentLook>("boy");
  const [teacher, setTeacher] = useState<TeacherVoice>("female");
  const [practiceDays, setPracticeDays] = useState<string[]>([]);
  const pronounce = useClassroomVoice("de-DE");
  const scenarioVoice = useClassroomVoice("de-DE");
  const autoTimer = useRef<number | null>(null);
  const teacherRef = useRef(teacher);
  teacherRef.current = teacher;

  const qs = preview ? "?preview=true" : "";
  const lang = "de-DE";
  const meSrc = studentKid(look);
  const themSrc = partnerKid(look);

  useEffect(() => {
    setPracticeDays(loadPracticeDays());
    void getCurrentUser().then((user) => {
      setLook(loadLook(user?.name));
      setTeacher(loadTeacherVoice());
    });
    const ready = () => setTeacher(loadTeacherVoice());
    window.speechSynthesis?.addEventListener("voiceschanged", ready);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", ready);
  }, []);

  function voiceLine(text: string) {
    speakGerman(text, teacherRef.current, lang);
  }

  function playLine(phrase: Phrase, onTalk: (v: boolean) => void) {
    onTalk(true);
    const done = () => onTalk(false);
    if (phrase.audio_url) {
      const audio = new Audio(phrase.audio_url);
      audio.onended = done;
      audio.onerror = () => {
        voiceLine(phrase.target_text);
        window.setTimeout(done, 1500);
      };
      void audio.play().catch(() => {
        voiceLine(phrase.target_text);
        window.setTimeout(done, 1500);
      });
      return;
    }
    voiceLine(phrase.target_text);
    window.setTimeout(done, 1500);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/player/${encodeURIComponent(slug)}/phrasebook${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setError(typeof body?.detail === "string" ? body.detail : "We couldn't open this classroom.");
        return;
      }
      const next = body as Phrasebook;
      setBook(next);
      setLearned(new Set((next.learned_phrase_ids ?? []).map(String)));
      const map: Record<string, AssessmentRecord> = {};
      for (const row of next.module_assessments ?? []) {
        map[row.module_key] = { scorePct: row.score_pct, passed: row.passed, at: row.at };
      }
      setAssessments(map);
      const ordered = [...(next.phrases ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const firstSection = [...(next.sections ?? [])].sort((a, b) => a.position - b.position)[0];
      setModuleId(firstSection?.id ?? "main");
      setPhraseId(ordered[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, qs]);

  const modules = useMemo(() => {
    if (!book) return [];
    const phrases = [...(book.phrases ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const sections = [...(book.sections ?? [])].sort((a, b) => a.position - b.position);
    if (sections.length) {
      const grouped = sections.map((section) => ({
        id: section.id,
        title: section.title,
        sceneKey: section.scene_key,
        phrases: phrases.filter((row) => row.section_id === section.id),
      }));
      const withLessons = grouped.filter((row) => row.phrases.length);
      if (withLessons.length) return withLessons;
    }
    return [
      {
        id: sections[0]?.id ?? "main",
        title: sections[0]?.title || "Module 1",
        sceneKey: sections[0]?.scene_key,
        phrases,
      },
    ];
  }, [book]);

  const currentModule = modules.find((row) => row.id === (moduleId ?? modules[0]?.id)) ?? modules[0] ?? null;
  const lessonPhrases = currentModule?.phrases ?? [];
  const phrase = lessonPhrases.find((row) => row.id === phraseId) ?? lessonPhrases[0] ?? null;
  const phraseIndex = phrase ? lessonPhrases.findIndex((row) => row.id === phrase.id) : 0;
  const ipa = phrase ? phraseIpa(phrase.target_text, phrase.ipa) : "";
  const usage = phrase ? phraseUsage(phrase.source_text, phrase.target_text, phrase.usage_note) : "";
  const tips = phrase ? phraseTips(phrase.source_text, phrase.target_text) : [];
  const nextPhrase = lessonPhrases[phraseIndex + 1] ?? null;
  const readiness = book?.phrases?.length
    ? Math.round((learned.size / Math.max(1, book.phrases.length)) * 100)
    : book?.progress_pct ?? 0;
  const moduleIndex = Math.max(0, modules.findIndex((row) => row.id === currentModule?.id));
  const moduleNumber = moduleIndex + 1;
  const moduleKey = currentModule?.id ?? "main";
  const lessonNumber = phraseIndex + 1;
  const passedCount = modules.filter((row) => assessments[row.id]?.passed).length;
  const xp = classroomXp(learned.size, passedCount);
  const nextModule = modules[moduleIndex + 1] ?? null;
  const lastLesson = phraseIndex >= lessonPhrases.length - 1;
  const moduleScores = modules.map((row, index) => ({
    id: row.id,
    title: row.title,
    lessons: row.phrases.length,
    learned: row.phrases.filter((item) => learned.has(item.id)).length,
    scorePct: assessments[row.id]?.scorePct ?? null,
    passed: Boolean(assessments[row.id]?.passed),
    locked: Boolean(!preview && index > 0 && !assessments[modules[index - 1]?.id]?.passed),
  }));
  const overallScore = (() => {
    const taken = moduleScores.filter((row) => row.scorePct != null);
    if (!taken.length) return 0;
    return Math.round(taken.reduce((sum, row) => sum + (row.scorePct ?? 0), 0) / taken.length);
  })();

  function moduleIsLocked(index: number) {
    if (preview || index <= 0) return false;
    return !assessments[modules[index - 1]?.id]?.passed;
  }

  function openModule(id: string, startPhraseId?: string) {
    const index = modules.findIndex((row) => row.id === id);
    if (moduleIsLocked(index)) {
      const gate = modules[index - 1] ?? modules[0];
      setModuleId(gate.id);
      setView("assessment");
      return;
    }
    const target = modules[index] ?? modules[0];
    setModuleId(target.id);
    setPhraseId(startPhraseId ?? target.phrases[0]?.id ?? null);
    setTab("listen");
    setView("classroom");
  }

  function openLessonInModule(phrase: Phrase) {
    setPhraseId(phrase.id);
    setTab("listen");
    setView("classroom");
  }
  const world = sceneSrc(currentModule?.sceneKey, `${phrase?.target_text ?? ""} ${chat.map((row) => row.text).join(" ")}`);

  const markLearned = useCallback(
    (id: string) => {
      setLearned((prev) => new Set(prev).add(id));
      setPracticeDays(markPracticeToday());
      if (preview) return;
      void fetch("/api/player/audio/learned", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_slug: slug, phrase_id: id }),
      }).catch(() => null);
    },
    [preview, slug],
  );

  const seedChat = useCallback((line: Phrase) => {
    setChat([{ id: "open", who: "them", text: sceneOpening(line) }]);
  }, []);

  useEffect(() => {
    if (phrase) seedChat(phrase);
  }, [phrase?.id, seedChat]);

  function afterLearn() {
    const order: LearnTab[] = ["listen", "pronounce", "spelling", "usage"];
    const i = order.indexOf(tab);
    if (i < order.length - 1) {
      setTab(order[i + 1]);
      setVerdict(null);
      return;
    }
    if (phrase) markLearned(phrase.id);
    if (nextPhrase) {
      setPhraseId(nextPhrase.id);
      setTab("listen");
      setVerdict(null);
      return;
    }
    setView("assessment");
  }

  function playPhrase() {
    if (!phrase) return;
    playLine(phrase, setTalking);
    if (tab === "listen") {
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
      autoTimer.current = window.setTimeout(() => afterLearn(), 2200);
    }
  }

  function scoreSpeech(expect: string, heard: string) {
    const ok = Boolean(heard) && normalize(heard) === normalize(expect);
    setVerdict(ok ? "ok" : heard ? "bad" : null);
    if (ok && phrase) markLearned(phrase.id);
    return ok;
  }

  useEffect(() => {
    if (!pronounce.recording && pronounce.heard && tab === "pronounce" && phrase) {
      const ok = scoreSpeech(phrase.target_text, pronounce.heard);
      if (ok) window.setTimeout(() => afterLearn(), 800);
    }
  }, [pronounce.recording, pronounce.heard]);

  useEffect(() => {
    if (!scenarioVoice.recording && scenarioVoice.heard) setDraft(scenarioVoice.heard);
  }, [scenarioVoice.recording, scenarioVoice.heard]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-[#10244F]/70">{error}</p>
        <Link href="/dashboard" className="text-sm font-semibold text-brand-accent">
          Your desk
        </Link>
      </div>
    );
  }

  if (!book) {
    return <p className="py-20 text-center text-sm text-[#10244F]/50">Opening your classroom…</p>;
  }
  if (!phrase) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-[#10244F]/70">This classroom has no lessons yet. Add a module and a lesson in Course Studio.</p>
        {preview ? (
          <Link href={`/instructor/studio/${slug}`} className="text-sm font-semibold text-brand-accent">
            Back to Course Studio
          </Link>
        ) : (
          <Link href="/dashboard" className="text-sm font-semibold text-brand-accent">
            Your desk
          </Link>
        )}
      </div>
    );
  }

  const nav = [
    { id: "classroom" as const, label: "My Classroom", icon: Home },
    { id: "assessment" as const, label: "Assessment", icon: Trophy },
    { id: "scenario" as const, label: "Real-life", icon: MessageCircle },
    { id: "hub" as const, label: "Opportunity Hub", icon: Target },
    { id: "progress" as const, label: "My Progress", icon: GraduationCap },
    { id: "community" as const, label: "Community", icon: Users },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const learnTabs: { id: LearnTab; label: string; icon: typeof Headphones }[] = [
    { id: "listen", label: "Listen", icon: Headphones },
    { id: "pronounce", label: "Pronounce", icon: Mic },
    { id: "spelling", label: "Spelling", icon: Type },
    { id: "usage", label: "Usage", icon: Lightbulb },
  ];

  function sendScenario() {
    const text = draft.trim() || scenarioVoice.heard.trim();
    if (!text && !scenarioVoice.clipUrl) return;
    const mine: ChatMsg = {
      id: `me-${Date.now()}`,
      who: "me",
      text: text || "Voice note",
      audioUrl: scenarioVoice.clipUrl,
    };
    const used = new Set(chat.filter((row) => row.who === "them").map((row) => normalize(row.text)));
    const replyText = sceneReply(text, used, sceneFollowUps(phrase, lessonPhrases));
    const them: ChatMsg | null = replyText
      ? { id: `them-${Date.now()}`, who: "them", text: replyText }
      : null;
    setChat((prev) => (them ? [...prev, mine, them] : [...prev, mine]));
    setDraft("");
    scenarioVoice.clearClip();
    setPracticeDays(markPracticeToday());
    markLearned(phrase.id);
    if (replyText) window.setTimeout(() => voiceLine(replyText), 350);
  }

  return (
    <div className="classroom-room flex h-dvh overflow-hidden">
      <aside className={`${navOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden lg:flex"} cr-surface w-[13.75rem] shrink-0 flex-col`}>
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="Desk">
            <LogoMark className="max-w-[8.5rem]" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const on = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id);
                  setNavOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm font-semibold ${
                  on ? "cr-chip-on" : "cr-muted hover:bg-[var(--cr-surface-soft)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="m-3 overflow-hidden rounded-[18px] bg-[#1457D0] text-white">
          <div className="p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Germany readiness</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{readiness}%</p>
            <p className="text-xs text-white/75">On track</p>
          </div>
          <img src="/marketing/germany.jpg" alt="" className="h-16 w-full object-cover opacity-90" />
        </div>
      </aside>
      {navOpen ? (
        <button type="button" className="fixed inset-0 z-30 bg-[#10244F]/30 lg:hidden" aria-label="Close" onClick={() => setNavOpen(false)} />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="cr-surface flex h-14 min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <button type="button" className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <ChevronLeft className="h-5 w-5 rotate-180" />
          </button>
          <p className="inline-flex min-w-0 flex-1 items-center gap-2 truncate text-xs font-semibold sm:text-sm">
            <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-[#1457D0] text-[10px] font-bold text-white sm:inline-flex">
              {book?.cefr_level || "A1"}
            </span>
            <span className="truncate">
              Module {moduleNumber}: {currentModule?.title} · Lesson {lessonNumber} of {lessonPhrases.length}
            </span>
          </p>
          <div className="hidden items-center gap-1 md:flex">
            {modules.map((row, index) => {
              const locked = moduleIsLocked(index);
              const on = row.id === moduleKey;
              return (
                <button
                  key={row.id}
                  type="button"
                  title={locked ? `Pass module ${index} first` : row.title}
                  onClick={() => openModule(row.id)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-extrabold ${
                    on ? "bg-[#1457D0] text-white" : locked ? "cr-chip cr-muted" : "cr-chip"
                  }`}
                >
                  {locked ? <Lock className="h-3 w-3" /> : `M${index + 1}`}
                </button>
              );
            })}
          </div>
          <AppearanceMenu />
          <span aria-hidden className="hidden sm:inline">
            🇩🇪
          </span>
          <span className="cr-muted shrink-0 text-[11px] font-semibold sm:text-xs">{xp} XP</span>
          {preview ? (
            <Link href={`/instructor/studio/${slug}`} className="text-xs font-semibold text-brand-accent">
              Studio
            </Link>
          ) : null}
        </header>

        <main className="cr-stage relative flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4">
          {view === "hub" ? (
            <div className="h-full min-h-0">
              <ClassroomOpportunityHub />
            </div>
          ) : null}
          {view === "progress" ? (
            <ClassroomProgress
              overallScore={overallScore}
              readiness={readiness}
              xp={xp}
              modules={moduleScores}
              practiceDays={practiceDays}
            />
          ) : null}
          {view === "community" ? (
            <div className="h-full min-h-0">
              <ClassroomCommunity />
            </div>
          ) : null}
          {view === "settings" ? (
            <ClassroomSettings
              look={look}
              teacher={teacher}
              onLook={(next) => {
                setLook(next);
                saveLook(next);
              }}
              onTeacher={(next) => {
                setTeacher(next);
                saveTeacherVoice(next);
                speakGerman("Hallo! Willkommen bei Multivate!", next);
              }}
            />
          ) : null}

          {view === "classroom" ? (
            <div className="mx-auto grid h-full min-h-0 w-full max-w-[92rem] grid-cols-1 gap-3 xl:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)_18rem] xl:grid-rows-[minmax(0,1fr)_auto]">
              <div className="hidden min-h-0 items-end justify-center xl:flex">
                <Kid
                  src="/classroom/guide.png"
                  talking={talking}
                  stack
                  className="h-[min(26rem,58dvh)] w-auto max-w-full object-contain object-bottom"
                  bubble="Hallo! Willkommen bei Multivate!"
                  onSpeak={() => playPhrase()}
                />
              </div>

              <section className="cr-surface flex min-h-0 flex-col overflow-y-auto rounded-[22px] p-3 shadow-[0_12px_30px_rgba(16,36,79,0.08)] sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="inline-flex items-center gap-2 text-base font-extrabold">
                    <LogoMark size="sm" /> Let&apos;s learn
                  </h1>
                  <div className="flex flex-wrap gap-1">
                    {learnTabs.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTab(item.id);
                          setVerdict(null);
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
                          tab === item.id ? "cr-chip-on" : "cr-chip"
                        }`}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cr-surface-soft mt-4 rounded-[18px] px-3 py-5 sm:px-4 sm:py-6">
                  <div className="flex items-center justify-center gap-2 sm:gap-4">
                    <button type="button" onClick={() => playPhrase()} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1457D0] text-white sm:h-12 sm:w-12" aria-label="Play">
                      <Volume2 className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 text-center">
                      <p className="break-words text-[1.65rem] font-extrabold leading-tight tracking-tight cr-text sm:text-4xl">{phrase.target_text}</p>
                      {ipa ? <p className="cr-muted mt-1 text-sm">/{ipa}/</p> : null}
                    </div>
                    <button type="button" onClick={() => playPhrase()} className="cr-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1457D0] sm:h-12 sm:w-12" aria-label="Play again">
                      ▶
                    </button>
                  </div>
                  <p className="cr-muted mt-3 text-center text-sm font-medium">Meaning: {phrase.source_text}</p>
                </div>

                {tab === "pronounce" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        void pronounce.start();
                      }}
                      onPointerUp={() => pronounce.stop()}
                      onPointerCancel={() => pronounce.stop()}
                      className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-white ${pronounce.recording ? "bg-rose-500" : "bg-[#1457D0]"}`}
                    >
                      <Mic className="h-6 w-6" />
                    </button>
                    <div className="text-sm">
                      <p className="font-semibold">{pronounce.recording ? "Listening… release to stop" : "Hold Speak and say the German line"}</p>
                      <p className="cr-muted">{pronounce.heard || "Allow the microphone when asked."}</p>
                    </div>
                  </div>
                ) : null}

                {tab === "spelling" ? <p className="mt-4 text-center font-mono text-lg font-semibold tracking-[0.22em]">{spellLetters(phrase.target_text)}</p> : null}

                <div className="mt-auto grid items-end gap-3 pt-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-extrabold">When to use</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      <li className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> When greeting someone.
                      </li>
                      <li className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {usage}
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-end justify-center gap-1 overflow-hidden sm:justify-end sm:gap-2">
                    <Kid src={themSrc} talking={talking} className="h-16 w-auto object-contain object-bottom sm:h-24" />
                    <button
                      type="button"
                      onClick={() => voiceLine(phrase.target_text)}
                      className="cr-say cr-say-sm mb-6 max-w-[46vw] sm:mb-10 sm:max-w-none"
                      aria-label="Play line"
                    >
                      <LogoMark size="sm" variant="color" />
                      <span className="truncate">
                        {phrase.target_text}
                        <Volume2 className="ml-1 inline h-3.5 w-3.5 text-[#1457D0]" />
                      </span>
                    </button>
                    <Kid src={meSrc} className="h-16 w-auto object-contain object-bottom sm:h-24" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {lessonPhrases.map((row, index) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => openLessonInModule(row)}
                        className={`h-8 min-w-8 rounded-full px-2 text-[11px] font-extrabold ${
                          row.id === phrase.id ? "bg-[#1457D0] text-white" : learned.has(row.id) ? "cr-accent-soft" : "cr-chip"
                        }`}
                        title={row.target_text}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={afterLearn} className="h-9 rounded-full bg-[#1457D0] px-4 text-sm font-semibold text-white">
                    {tab !== "usage" ? "Continue" : lastLesson ? "Module assessment" : "Next lesson"}
                  </button>
                </div>
              </section>

              <div className="hidden min-h-0 flex-col gap-3 lg:flex">
                <section className="cr-surface flex-1 rounded-[18px] p-4 shadow-sm">
                  <p className="inline-flex items-center gap-2 text-sm font-extrabold">
                    <Lightbulb className="h-4 w-4 text-amber-500" /> Quick tips
                  </p>
                  <ul className="cr-muted mt-3 space-y-2 text-sm">
                    {tips.map((tip) => (
                      <li key={tip} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-[#1457D0]" /> {tip}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-[18px] bg-[#5B4DFF] p-4 text-white">
                  <p className="text-sm font-extrabold">Practise speaking</p>
                  <Waveform active={pronounce.recording || talking} />
                  <button
                    type="button"
                    onClick={() => {
                      setTab("pronounce");
                      pronounce.toggle();
                    }}
                    className="cr-surface mt-3 inline-flex h-12 w-12 items-center justify-center rounded-full text-[#5B4DFF]"
                    aria-label="Hold to speak"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <p className="mt-2 text-xs text-white/80">Hold to speak</p>
                </section>
              </div>

              <section className="cr-surface rounded-[22px] p-4 shadow-sm xl:col-span-2 xl:col-start-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="inline-flex items-center gap-2 text-sm font-extrabold">
                      <Trophy className="h-4 w-4 text-amber-500" /> Module assessment
                    </h2>
                    <p className="cr-muted text-xs">
                      {lastLesson
                        ? `Finish this module at 70% to unlock the next one.${assessments[moduleKey]?.passed ? ` Last score ${assessments[moduleKey].scorePct}%.` : ""}`
                        : `Complete all ${lessonPhrases.length} lessons, then take the module test.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("assessment")}
                    disabled={!lastLesson && !assessments[moduleKey]?.passed}
                    className="h-10 w-full shrink-0 rounded-full bg-[#1457D0] px-4 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto"
                  >
                    {assessments[moduleKey]?.passed ? "Retake assessment" : lastLesson ? "Start assessment" : "Locked until last lesson"}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {view === "assessment" ? (
            <ClassroomAssessment
              lessonTitle={`Module ${moduleNumber}: ${currentModule?.title}`}
              lessonKey={moduleKey}
              slug={slug}
              preview={preview}
              phrases={lessonPhrases}
              previous={assessments[moduleKey] ?? null}
              voiceLine={voiceLine}
              nextLabel={nextModule ? `Module ${moduleNumber + 1}: ${nextModule.title}` : "Back to classroom"}
              onNextLesson={
                nextModule
                  ? () => openModule(nextModule.id)
                  : () => setView("classroom")
              }
              onSaved={(key, result) => {
                setAssessments((prev) => ({ ...prev, [key]: result }));
                if (result.passed) {
                  lessonPhrases.forEach((row) => markLearned(row.id));
                }
              }}
            />
          ) : null}

          {view === "scenario" ? (
            <div className="cr-surface mx-auto flex h-full min-h-0 w-full max-w-[92rem] flex-col overflow-hidden rounded-[22px] shadow-[0_12px_30px_rgba(16,36,79,0.08)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
              <div className="relative h-[28vw] min-h-[7.25rem] max-h-[10.5rem] shrink-0 overflow-hidden bg-[#10244F] lg:h-full lg:max-h-none lg:min-h-0">
                <img src={world} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10244F]/55 via-transparent to-[#10244F]/10" />
                <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-2.5 py-1 sm:left-4 sm:top-4">
                  <LogoMark size="sm" variant="color" />
                  <span className="text-xs font-semibold text-[#10244F]">Practice scene</span>
                </div>
                <p className="absolute bottom-2 left-3 right-3 inline-flex min-w-0 items-center gap-2 truncate rounded-lg bg-[#10244F]/70 px-3 py-1.5 text-xs font-semibold text-white sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:py-2 sm:text-sm">
                  <LogoMark size="sm" variant="inverse" />
                  <span className="truncate">
                    {phrase.target_text} · {phrase.source_text}
                  </span>
                </p>
              </div>
              <aside className="flex min-h-0 min-w-0 flex-1 flex-col lg:border-l lg:border-[#10244F]/8">
                <div className="flex items-end justify-between gap-2 border-b border-[#10244F]/8 px-3 pt-2 sm:gap-3 sm:px-4 sm:pt-3">
                  <div className="min-w-0 pb-2 sm:pb-3">
                    <h2 className="inline-flex items-center gap-2 text-sm font-extrabold">
                      <LogoMark size="sm" />
                      <span className="truncate">Real-life practice</span>
                    </h2>
                    <p className="cr-muted mt-1 hidden text-xs sm:block">Reply in German as you would at work, on campus, or in town.</p>
                  </div>
                  <div className="flex shrink-0 items-end gap-1 sm:gap-2">
                    <Kid src={themSrc} talking={talking} className="h-10 w-auto object-contain object-bottom sm:h-[4.5rem]" />
                    <Kid src={meSrc} className="h-10 w-auto object-contain object-bottom sm:h-[4.5rem]" />
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                  {chat.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.who === "me" ? "flex-row-reverse" : ""}`}>
                      <Kid
                        src={msg.who === "me" ? meSrc : themSrc}
                        talking={msg.who === "them" && talking}
                        className="h-10 w-auto object-contain object-bottom sm:h-14"
                      />
                      <div
                        className={`max-w-[78%] rounded-[14px] px-3 py-2 text-[15px] font-medium leading-snug ${
                          msg.who === "me" ? "rounded-tr-sm bg-[#1457D0] text-white" : "cr-chip rounded-tl-sm"
                        }`}
                      >
                        {msg.who === "them" ? (
                          <span className="inline-flex items-start gap-1.5">
                            <LogoMark size="sm" variant="color" />
                            <span>{msg.text}</span>
                          </span>
                        ) : (
                          msg.text
                        )}
                        <button
                          type="button"
                          className="ml-2 align-middle"
                          aria-label="Play message"
                          onClick={() => {
                            if (msg.audioUrl) {
                              const audio = new Audio(msg.audioUrl);
                              void audio.play();
                            } else {
                              voiceLine(msg.text);
                            }
                          }}
                        >
                          <Volume2 className="inline h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-[#10244F]/8 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type or speak in German…"
                    className="h-10 min-w-0 flex-1 rounded-full border border-[#10244F]/15 px-3 text-base outline-none focus:border-[#1457D0] sm:text-sm"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        sendScenario();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      void scenarioVoice.start();
                    }}
                    onPointerUp={() => scenarioVoice.stop()}
                    onPointerCancel={() => scenarioVoice.stop()}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${scenarioVoice.recording ? "bg-rose-500 text-white" : "cr-chip text-[#1457D0]"}`}
                    aria-label="Hold to speak"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={sendScenario} className="h-10 shrink-0 rounded-full bg-[#1457D0] px-3 text-sm font-semibold text-white sm:px-4">
                    Send
                  </button>
                </div>
                {scenarioVoice.heard ? <p className="cr-muted px-3 pb-2 text-[11px]">Heard: {scenarioVoice.heard}</p> : null}
                {scenarioVoice.error ? <p className="px-3 pb-2 text-[11px] text-rose-600">{scenarioVoice.error}</p> : null}
              </aside>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
