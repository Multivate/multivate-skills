"use client";

import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Flame,
  GraduationCap,
  Headphones,
  Lock,
  Menu,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Star,
  Trophy,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Phrase = {
  id: string;
  section_id: string | null;
  position: number;
  source_text: string;
  target_text: string;
  audio_url: string | null;
  audio_duration_seconds: number;
};

type Section = { id: string; title: string; position: number };

type Phrasebook = {
  course_slug: string;
  course_title: string;
  image_url: string;
  format: string;
  source_language: string;
  target_language: string;
  progress_pct: number;
  sections: Section[];
  phrases: Phrase[];
};

type Props = { slug: string; preview?: boolean };

type ViewMode = "phrasebook" | "assessment";
type LangTrack = "en" | "de";

type QuizQuestion = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
};

type AssessmentRecord = { scorePct: number; passed: boolean; at: string };

const PASS_MARK = 70;
const SPEEDS = [1, 0.8] as const;

function storageKey(slug: string, part: string) {
  return `multivate:audio:${slug}:${part}`;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadStreak(): number {
  const data = loadJson<{ count: number; last: string }>("multivate:learning-streak", {
    count: 0,
    last: "",
  });
  const today = todayKey();
  if (data.last === today) return data.count;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (data.last === yesterday.toISOString().slice(0, 10)) return data.count;
  return 0;
}

function bumpStreak() {
  const data = loadJson<{ count: number; last: string }>("multivate:learning-streak", {
    count: 0,
    last: "",
  });
  const today = todayKey();
  if (data.last === today) return data.count;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const next = data.last === yesterday.toISOString().slice(0, 10) ? data.count + 1 : 1;
  saveJson("multivate:learning-streak", { count: next, last: today });
  return next;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQuiz(phrases: Phrase[], targetLang: string): QuizQuestion[] {
  const pool = phrases.filter((p) => p.source_text.trim() && p.target_text.trim());
  if (pool.length === 0) return [];
  const take = Math.min(5, pool.length);
  const picked = shuffle(pool).slice(0, take);
  const allTargets = pool.map((p) => p.target_text);

  return picked.map((p) => {
    const distractors = shuffle(allTargets.filter((t) => t !== p.target_text)).slice(0, 3);
    while (distractors.length < 3) distractors.push(`Option ${distractors.length + 1}`);
    const options = shuffle([
      { id: `c_${p.id}`, text: p.target_text },
      ...distractors.map((text, i) => ({ id: `d_${p.id}_${i}`, text })),
    ]);
    return {
      id: p.id,
      prompt: `How do you say “${p.source_text}” in ${targetLang.toUpperCase()}?`,
      options,
      correct_option_id: `c_${p.id}`,
    };
  });
}

function levelBadge(title: string) {
  const m = title.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  return m ? m[1].toUpperCase() : "A1";
}

export function AudioPhrasebookPlayer({ slug, preview = false }: Props) {
  const [data, setData] = useState<Phrasebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("phrasebook");
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const [assessments, setAssessments] = useState<Record<string, AssessmentRecord>>({});
  const [streak, setStreak] = useState(0);

  const [activePhraseId, setActivePhraseId] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<LangTrack>("de");
  const [cardLit, setCardLit] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [repeat, setRepeat] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [scoreCorrect, setScoreCorrect] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [finalScorePct, setFinalScorePct] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const phrasesRef = useRef<Phrase[]>([]);
  const qs = preview ? "?preview=true" : "";

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/player/${encodeURIComponent(slug)}/phrasebook${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof body?.detail === "string" ? body.detail : "We couldn't open this phrasebook.");
      return;
    }
    setData(body as Phrasebook);
  }, [slug, qs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setLearned(new Set(loadJson<string[]>(storageKey(slug, "learned"), [])));
    setAssessments(loadJson<Record<string, AssessmentRecord>>(storageKey(slug, "assessments"), {}));
    setStreak(loadStreak());
  }, [slug]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const modules = useMemo(() => {
    if (!data) return [];
    const sections = [...data.sections].sort((a, b) => a.position - b.position);
    const phrases = [...data.phrases].sort((a, b) => a.position - b.position);
    if (sections.length === 0) {
      return [{ id: "all", title: data.course_title, position: 0, phrases }];
    }
    const rows = sections.map((s) => ({
      id: s.id,
      title: s.title,
      position: s.position,
      phrases: phrases.filter((p) => p.section_id === s.id),
    }));
    const loose = phrases.filter((p) => !p.section_id);
    if (loose.length) rows.unshift({ id: "loose", title: "Extras", position: -1, phrases: loose });
    return rows;
  }, [data]);

  const moduleMeta = useMemo(
    () =>
      modules.map((mod, index) => {
        const prev = index > 0 ? modules[index - 1] : null;
        const prevPassed = prev ? Boolean(assessments[prev.id]?.passed) : true;
        const locked = index > 0 && !prevPassed && !preview;
        const learnedCount = mod.phrases.filter((p) => learned.has(p.id)).length;
        return { ...mod, index, locked, learnedCount, result: assessments[mod.id] ?? null };
      }),
    [modules, assessments, learned, preview],
  );

  useEffect(() => {
    if (!moduleMeta.length) return;
    if (activeModuleId && moduleMeta.some((m) => m.id === activeModuleId && !m.locked)) return;
    setActiveModuleId((moduleMeta.find((m) => !m.locked) ?? moduleMeta[0]).id);
  }, [moduleMeta, activeModuleId]);

  const activeModule = moduleMeta.find((m) => m.id === activeModuleId) ?? moduleMeta[0] ?? null;
  const phrases = activeModule?.phrases ?? [];
  phrasesRef.current = phrases;
  const activePhrase = phrases.find((p) => p.id === activePhraseId) ?? phrases[0] ?? null;
  const activeIndex = activePhrase ? phrases.findIndex((p) => p.id === activePhrase.id) : -1;

  const markLearned = useCallback(
    (phraseId: string) => {
      setLearned((prev) => {
        if (prev.has(phraseId)) return prev;
        const next = new Set(prev);
        next.add(phraseId);
        saveJson(storageKey(slug, "learned"), [...next]);
        return next;
      });
      setStreak(bumpStreak());
    },
    [slug],
  );

  const flashHighlight = useCallback((phraseId: string, lang: LangTrack) => {
    setActivePhraseId(phraseId);
    setActiveLang(lang);
    setCardLit(true);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setCardLit(false), 1500);
  }, []);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  const playTrack = useCallback(
    (phrase: Phrase, lang: LangTrack, chain = false) => {
      stopPlayback();
      flashHighlight(phrase.id, lang);
      markLearned(phrase.id);
      setPlaying(true);

      const finish = () => {
        setPlaying(false);
        const list = phrasesRef.current;
        const idx = list.findIndex((p) => p.id === phrase.id);
        if (autoPlay || chain) {
          const next = list[idx + 1];
          if (next) window.setTimeout(() => playTrack(next, lang, true), 350);
          return;
        }
        if (repeat) window.setTimeout(() => playTrack(phrase, lang), 250);
      };

      if (lang === "de" && phrase.audio_url) {
        if (!audioRef.current) audioRef.current = new Audio();
        const el = audioRef.current;
        el.onended = () => finish();
        el.src = phrase.audio_url;
        el.playbackRate = speed;
        void el.play().catch(() => setPlaying(false));
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(lang === "en" ? phrase.source_text : phrase.target_text);
        utter.lang = lang === "en" ? "en-US" : "de-DE";
        utter.rate = speed;
        utter.onend = () => finish();
        utter.onerror = () => setPlaying(false);
        window.speechSynthesis.speak(utter);
        return;
      }

      window.setTimeout(finish, 1500);
    },
    [autoPlay, flashHighlight, markLearned, repeat, speed, stopPlayback],
  );

  const startAssessment = useCallback(() => {
    if (!activeModule || activeModule.locked || !data) return;
    const questions = buildQuiz(activeModule.phrases, data.target_language);
    setQuiz(questions);
    setQIndex(0);
    setSelected(null);
    setChecked(false);
    setScoreCorrect(0);
    setQuizDone(false);
    setFinalScorePct(0);
    setView("assessment");
    stopPlayback();
  }, [activeModule, data, stopPlayback]);

  const checkAnswer = () => {
    if (!selected || checked || !quiz[qIndex]) return;
    if (selected === quiz[qIndex].correct_option_id) setScoreCorrect((n) => n + 1);
    setChecked(true);
  };

  const onContinue = () => {
    if (!checked || !quiz.length) return;
    if (qIndex + 1 >= quiz.length) {
      const pct = Math.round((scoreCorrect / quiz.length) * 100);
      setFinalScorePct(pct);
      if (activeModule) {
        const next = {
          ...assessments,
          [activeModule.id]: { scorePct: pct, passed: pct >= PASS_MARK, at: new Date().toISOString() },
        };
        setAssessments(next);
        saveJson(storageKey(slug, "assessments"), next);
      }
      setStreak(bumpStreak());
      setQuizDone(true);
      return;
    }
    setQIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
  };

  if (error) {
    return (
      <div className="mx-auto max-w-lg border border-brand-ink/10 bg-white px-6 py-10 text-center">
        <p className="text-sm text-brand-ink/70">{error}</p>
        <Link
          href={preview ? `/dashboard/instructor/studio/${slug}` : "/dashboard/courses"}
          className="mt-6 inline-block text-sm font-semibold text-brand-accent"
        >
          Go back
        </Link>
      </div>
    );
  }

  if (!data || !activeModule) {
    return <p className="py-16 text-center text-sm text-brand-ink/50">Opening your class…</p>;
  }

  const badge = levelBadge(data.course_title);
  const currentQ = quiz[qIndex];
  const quizProgress = quiz.length ? ((qIndex + (checked ? 1 : 0)) / quiz.length) * 100 : 0;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-brand-paper text-brand-ink antialiased">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-brand-ink/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col border-r border-brand-ink/10 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start gap-3 border-b border-brand-ink/10 px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent font-display text-sm font-bold text-white">
            {badge}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold text-brand-ink">{data.course_title}</p>
            <p className="mt-0.5 text-xs text-brand-ink/50">Audio-First Phrasebook</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-brand-ink/45 hover:bg-brand-muted lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="hide-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-4">
          <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/40">Modules</p>
          {moduleMeta.map((mod, i) => {
            const selectedMod = mod.id === activeModule.id;
            return (
              <button
                key={mod.id}
                type="button"
                disabled={mod.locked}
                onClick={() => {
                  if (mod.locked) return;
                  setActiveModuleId(mod.id);
                  setView("phrasebook");
                  setSidebarOpen(false);
                  stopPlayback();
                }}
                className={`relative w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
                  mod.locked
                    ? "cursor-not-allowed border-transparent opacity-45"
                    : selectedMod
                      ? "border-brand-accent/30 bg-brand-accent/10 shadow-sm"
                      : "border-transparent bg-brand-muted/50 hover:border-brand-ink/10 hover:bg-brand-muted"
                }`}
              >
                {selectedMod && !mod.locked ? (
                  <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand-accent" />
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brand-ink/40">
                      Module {i + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-ink">{mod.title}</p>
                  </div>
                  {mod.locked ? (
                    <Lock className="mt-1 h-4 w-4 shrink-0 text-brand-ink/35" />
                  ) : selectedMod ? (
                    <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                      Active
                    </span>
                  ) : mod.result?.passed ? (
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : null}
                </div>
                {!mod.locked ? (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-brand-ink/10">
                      <div
                        className="h-full rounded-full bg-brand-accent transition-all duration-300"
                        style={{
                          width: `${mod.phrases.length ? Math.round((mod.learnedCount / mod.phrases.length) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[0.7rem] text-brand-ink/50">
                      {mod.learnedCount} / {mod.phrases.length} items learned
                      {mod.result ? ` · Assessment ${mod.result.scorePct}%` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[0.7rem] text-brand-ink/40">Complete Module {i} assessment to unlock</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="m-3 rounded-2xl border border-brand-accent/20 bg-brand-accent/10 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent text-white">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-ink">
                {streak > 0 ? `${streak} Day Streak!` : "Start a streak"}
              </p>
              <p className="text-xs text-brand-ink/55">
                {streak > 0 ? "Excellent progress." : "Practice today to begin."}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-brand-ink/10 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-xl border border-brand-ink/10 p-2 text-brand-ink lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open modules"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <Link
              href={preview ? `/dashboard/instructor/studio/${slug}` : "/dashboard/courses"}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {preview ? "Studio" : "My courses"}
            </Link>
            <h1 className="truncate font-display text-lg font-bold text-brand-ink sm:text-xl">
              M{activeModule.index + 1}: {activeModule.title}
            </h1>
          </div>

          <div className="flex rounded-2xl border border-brand-ink/10 bg-brand-muted/70 p-1">
            <button
              type="button"
              onClick={() => {
                setView("phrasebook");
                stopPlayback();
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 sm:px-4 ${
                view === "phrasebook" ? "bg-white text-brand-ink shadow-sm" : "text-brand-ink/50 hover:text-brand-ink"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Phrasebook</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeModule.locked) startAssessment();
              }}
              disabled={activeModule.locked}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 sm:px-4 disabled:opacity-40 ${
                view === "assessment" ? "bg-white text-brand-ink shadow-sm" : "text-brand-ink/50 hover:text-brand-ink"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assessment</span>
            </button>
          </div>
        </header>

        {view === "phrasebook" ? (
          <>
            <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-36 pt-5 sm:px-6">
              <ul className="mx-auto max-w-3xl space-y-3">
                {phrases.map((phrase, idx) => {
                  const litNow = activePhraseId === phrase.id && (playing || cardLit);
                  return (
                    <li
                      key={phrase.id}
                      className={`flex items-center gap-4 rounded-2xl border bg-white px-4 py-4 transition-all duration-300 sm:px-5 ${
                        litNow
                          ? "border-brand-accent/40 border-l-4 border-l-brand-accent shadow-md"
                          : "border-brand-ink/10 hover:border-brand-ink/25"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-ink/55">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 ${
                              litNow && activeLang === "en" ? "text-brand-accent" : "text-brand-ink/45"
                            }`}
                          >
                            {phrase.source_text}
                          </p>
                          <p
                            className={`mt-1 font-display text-xl font-bold tracking-tight transition-colors duration-300 sm:text-2xl ${
                              litNow && activeLang === "de" ? "text-brand-accent" : "text-brand-ink"
                            }`}
                          >
                            {phrase.target_text}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => playTrack(phrase, "en")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/10 bg-brand-muted px-3 py-2 text-xs font-bold text-brand-ink/70 transition-all duration-300 hover:border-brand-ink/25"
                          aria-label="Play English"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => playTrack(phrase, "de")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-brand-accent/25 bg-brand-accent/15 px-3 py-2 text-xs font-bold text-brand-accent transition-all duration-300 hover:bg-brand-accent/25"
                          aria-label="Play German"
                        >
                          <Headphones className="h-3.5 w-3.5" />
                          DE
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {phrases.length === 0 ? (
                <p className="py-16 text-center text-sm text-brand-ink/50">No phrases in this module yet.</p>
              ) : null}
            </div>

            <div className="absolute inset-x-0 bottom-0 z-20 border-t border-brand-ink/10 bg-white/85 px-4 py-3 backdrop-blur-xl sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!activePhrase) return;
                    if (playing) stopPlayback();
                    else playTrack(activePhrase, activeLang, true);
                  }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent text-white shadow-lg shadow-brand-accent/25 transition-transform duration-300 hover:scale-105"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/40">
                    {autoPlay ? "Auto-play next" : "Now playing"}
                  </p>
                  <p className="truncate text-sm font-semibold text-brand-ink">
                    {activePhrase
                      ? activeLang === "en"
                        ? activePhrase.source_text
                        : activePhrase.target_text
                      : "Ready to start"}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    disabled={activeIndex <= 0}
                    onClick={() => {
                      const prev = phrases[activeIndex - 1];
                      if (prev) playTrack(prev, activeLang, true);
                    }}
                    className="rounded-xl p-2 text-brand-ink/55 transition hover:bg-brand-muted hover:text-brand-ink disabled:opacity-30"
                    aria-label="Previous"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={activeIndex < 0 || activeIndex >= phrases.length - 1}
                    onClick={() => {
                      const next = phrases[activeIndex + 1];
                      if (next) playTrack(next, activeLang, true);
                    }}
                    className="rounded-xl p-2 text-brand-ink/55 transition hover:bg-brand-muted hover:text-brand-ink disabled:opacity-30"
                    aria-label="Next"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        if (audioRef.current) audioRef.current.playbackRate = s;
                      }}
                      className={`rounded-lg px-2 py-1 text-[0.7rem] font-bold transition-all duration-300 ${
                        speed === s ? "bg-brand-ink text-white" : "bg-brand-muted text-brand-ink/55"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRepeat((v) => !v)}
                    className={`rounded-xl p-2 transition-all duration-300 ${
                      repeat ? "bg-brand-accent/15 text-brand-accent" : "text-brand-ink/45 hover:bg-brand-muted"
                    }`}
                    aria-label="Repeat"
                  >
                    <Repeat className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoPlay((v) => !v)}
                    className={`hidden rounded-xl px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide transition-all duration-300 sm:inline ${
                      autoPlay ? "bg-brand-accent text-white" : "bg-brand-muted text-brand-ink/50"
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="hide-scrollbar flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:px-6">
            <div className="w-full max-w-2xl rounded-3xl border border-brand-ink/10 bg-white p-6 shadow-xl shadow-brand-ink/5 sm:p-8">
              {quiz.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-brand-ink/60">Add more phrases to this module to unlock an assessment.</p>
                  <button type="button" onClick={() => setView("phrasebook")} className="mt-4 text-sm font-semibold text-brand-accent">
                    Back to phrasebook
                  </button>
                </div>
              ) : quizDone ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-accent/15 text-brand-accent">
                    <Trophy className="h-10 w-10" />
                  </div>
                  <h2 className="mt-6 font-display text-3xl font-bold text-brand-ink">
                    {finalScorePct >= PASS_MARK ? "Module Complete!" : "Keep practicing"}
                  </h2>
                  <p className="mt-2 text-sm text-brand-ink/60">
                    You scored <span className="font-bold text-brand-ink">{finalScorePct}%</span>
                    {finalScorePct >= PASS_MARK
                      ? " - next module unlocked."
                      : ` - need ${PASS_MARK}% to unlock the next module.`}
                  </p>
                  <p className="mt-1 text-xs text-brand-ink/40">
                    {scoreCorrect} of {quiz.length} correct · Detailed explanations coming soon
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startAssessment()}
                      className="rounded-2xl bg-brand-accent px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-accent-dark"
                    >
                      Retake Assessment
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("phrasebook")}
                      className="rounded-2xl border border-brand-ink/15 bg-white px-6 py-3 text-sm font-bold text-brand-ink transition hover:bg-brand-muted"
                    >
                      Back to Phrasebook
                    </button>
                  </div>
                </div>
              ) : currentQ ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">
                      Question {qIndex + 1} of {quiz.length}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-2.5 py-1 text-xs font-bold text-brand-ink">
                      <Star className="h-3.5 w-3.5 text-brand-accent" />
                      {Math.round((scoreCorrect / Math.max(quiz.length, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-ink/10">
                    <div
                      className="h-full rounded-full bg-brand-accent transition-all duration-300"
                      style={{ width: `${quizProgress}%` }}
                    />
                  </div>

                  <h2 className="mt-8 font-display text-2xl font-bold leading-snug text-brand-ink sm:text-3xl">
                    {currentQ.prompt}
                  </h2>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {currentQ.options.map((opt) => {
                      const isSel = selected === opt.id;
                      const showCorrect = checked && opt.id === currentQ.correct_option_id;
                      const showWrong = checked && isSel && opt.id !== currentQ.correct_option_id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={checked}
                          onClick={() => setSelected(opt.id)}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-all duration-300 ${
                            showCorrect
                              ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                              : showWrong
                                ? "border-red-400 bg-red-50 text-red-900"
                                : isSel
                                  ? "border-brand-accent bg-brand-accent/10 text-brand-ink"
                                  : "border-brand-ink/10 bg-brand-muted/60 text-brand-ink hover:border-brand-ink/25"
                          }`}
                        >
                          <span>{opt.text}</span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                              isSel || showCorrect ? "border-brand-accent bg-brand-accent" : "border-brand-ink/20 bg-white"
                            }`}
                          >
                            {(isSel || showCorrect) && <span className="h-2 w-2 rounded-full bg-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex flex-col gap-4 border-t border-brand-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-h-[1.5rem] text-sm font-semibold">
                      {checked ? (
                        selected === currentQ.correct_option_id ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-700">
                            <XCircle className="h-4 w-4" /> Incorrect
                          </span>
                        )
                      ) : null}
                    </div>
                    {!checked ? (
                      <button
                        type="button"
                        disabled={!selected}
                        onClick={checkAnswer}
                        className="rounded-2xl bg-brand-accent px-6 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-brand-accent-dark disabled:bg-brand-ink/15 disabled:text-brand-ink/40"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onContinue}
                        className="rounded-2xl border border-brand-ink bg-white px-6 py-3 text-sm font-bold text-brand-ink transition-all duration-300 hover:bg-brand-muted"
                      >
                        {qIndex + 1 >= quiz.length ? "See Results" : "Continue"}
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
