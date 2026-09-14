"use client";

import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/layout/LogoMark";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Flame,
  GraduationCap,
  Headphones,
  Lock,
  Menu,
  Moon,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Star,
  Sun,
  Trophy,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

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
  learned_phrase_ids?: string[];
  module_assessments?: { module_key: string; score_pct: number; passed: boolean; at: string }[];
};

type Props = { slug: string; preview?: boolean };

type ViewMode = "phrasebook" | "assessment";
type LangTrack = "en" | "de";

type QuizQuestion = {
  id: string;
  kind: "mcq" | "listen";
  prompt: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  speak_text?: string;
  speak_lang?: LangTrack;
  audio_url?: string | null;
};

type AssessmentRecord = { scorePct: number; passed: boolean; at: string };

const PASS_MARK = 70;
const SPEEDS = [1, 0.8] as const;
const QUIZ_SIZE = 20;
const LISTEN_COUNT = 5;

const CLASSROOM_THEME_KEY = "multivate:classroom-theme";

function loadClassroomTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(CLASSROOM_THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function streakKey(userId: string) {
  return `multivate:learning-streak:${userId}`;
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

function loadStreak(userId: string): number {
  const data = loadJson<{ count: number; last: string }>(streakKey(userId), {
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

function bumpStreak(userId: string) {
  const data = loadJson<{ count: number; last: string }>(streakKey(userId), {
    count: 0,
    last: "",
  });
  const today = todayKey();
  if (data.last === today) return data.count;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const next = data.last === yesterday.toISOString().slice(0, 10) ? data.count + 1 : 1;
  saveJson(streakKey(userId), { count: next, last: today });
  return next;
}

function cancelSpeech() {
  if (typeof window === "undefined") return;
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // Some browsers keep speaking after a single cancel; nudge the queue again.
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
    }
  } catch {
    /* ignore */
  }
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDistractors(correct: string, pool: string[], count: number) {
  const distractors = shuffle(pool.filter((t) => t !== correct)).slice(0, count);
  while (distractors.length < count) distractors.push(`Option ${distractors.length + 1}`);
  return distractors;
}

function buildMcqEnToDe(p: Phrase, allTargets: string[], targetLang: string, key: string): QuizQuestion {
  const options = shuffle([
    { id: `c_${key}`, text: p.target_text },
    ...pickDistractors(p.target_text, allTargets, 3).map((text, i) => ({ id: `d_${key}_${i}`, text })),
  ]);
  return {
    id: key,
    kind: "mcq",
    prompt: `How do you say “${p.source_text}” in ${targetLang.toUpperCase()}?`,
    options,
    correct_option_id: `c_${key}`,
  };
}

function buildMcqDeToEn(p: Phrase, allSources: string[], key: string): QuizQuestion {
  const options = shuffle([
    { id: `c_${key}`, text: p.source_text },
    ...pickDistractors(p.source_text, allSources, 3).map((text, i) => ({ id: `d_${key}_${i}`, text })),
  ]);
  return {
    id: key,
    kind: "mcq",
    prompt: `What does “${p.target_text}” mean in English?`,
    options,
    correct_option_id: `c_${key}`,
  };
}

function buildListenQuestion(p: Phrase, allSources: string[], key: string): QuizQuestion {
  const options = shuffle([
    { id: `c_${key}`, text: p.source_text },
    ...pickDistractors(p.source_text, allSources, 3).map((text, i) => ({ id: `d_${key}_${i}`, text })),
  ]);
  return {
    id: key,
    kind: "listen",
    prompt: "Listen to the German audio, then choose the English meaning.",
    options,
    correct_option_id: `c_${key}`,
    speak_text: p.target_text,
    speak_lang: "de",
    audio_url: p.audio_url,
  };
}

function buildQuiz(phrases: Phrase[], targetLang: string): QuizQuestion[] {
  const pool = phrases.filter((p) => p.source_text.trim() && p.target_text.trim());
  if (pool.length === 0) return [];

  const allTargets = pool.map((p) => p.target_text);
  const allSources = pool.map((p) => p.source_text);
  const mcqCount = QUIZ_SIZE - LISTEN_COUNT;
  const questions: QuizQuestion[] = [];

  const listenOrder = shuffle(pool);
  for (let i = 0; i < LISTEN_COUNT; i += 1) {
    const p = listenOrder[i % listenOrder.length];
    questions.push(buildListenQuestion(p, allSources, `listen_${i}_${p.id}`));
  }

  const mcqOrder = shuffle(pool);
  for (let i = 0; i < mcqCount; i += 1) {
    const p = mcqOrder[i % mcqOrder.length];
    const key = `mcq_${i}_${p.id}`;
    questions.push(
      i % 2 === 0
        ? buildMcqEnToDe(p, allTargets, targetLang, key)
        : buildMcqDeToEn(p, allSources, key),
    );
  }

  return shuffle(questions);
}

export function AudioPhrasebookPlayer({ slug, preview = false }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const persist = Boolean(userId) && !preview;

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
  const [autoPlay, setAutoPlay] = useState(true);

  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [scoreCorrect, setScoreCorrect] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [finalScorePct, setFinalScorePct] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(loadClassroomTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(CLASSROOM_THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const chainTimer = useRef<number | null>(null);
  const playSession = useRef(0);
  const mountedRef = useRef(true);
  const phrasesRef = useRef<Phrase[]>([]);
  const phraseElsRef = useRef<Map<string, HTMLLIElement>>(new Map());
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const autoPlayRef = useRef(autoPlay);
  const repeatRef = useRef(repeat);
  const speedRef = useRef(speed);
  autoPlayRef.current = autoPlay;
  repeatRef.current = repeat;
  speedRef.current = speed;

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
    const book = body as Phrasebook;
    setData(book);
    if (!preview) {
      setLearned(new Set((book.learned_phrase_ids ?? []).map(String)));
      const map: Record<string, AssessmentRecord> = {};
      for (const row of book.module_assessments ?? []) {
        map[row.module_key] = {
          scorePct: row.score_pct,
          passed: row.passed,
          at: row.at || new Date().toISOString(),
        };
      }
      setAssessments(map);
    } else {
      setLearned(new Set());
      setAssessments({});
    }
  }, [slug, qs, preview]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (preview || !userId) {
      setStreak(0);
      return;
    }
    setStreak(loadStreak(userId));
  }, [slug, userId, preview]);

  const stopPlayback = useCallback(() => {
    playSession.current += 1;
    if (chainTimer.current) {
      window.clearTimeout(chainTimer.current);
      chainTimer.current = null;
    }
    if (highlightTimer.current) {
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = null;
    }
    const el = audioRef.current;
    if (el) {
      el.onended = null;
      el.onerror = null;
      try {
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        /* ignore */
      }
    }
    cancelSpeech();
    setPlaying(false);
    setCardLit(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const hardStop = () => stopPlayback();
    window.addEventListener("pagehide", hardStop);
    window.addEventListener("beforeunload", hardStop);
    const onVis = () => {
      if (document.visibilityState === "hidden") hardStop();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mountedRef.current = false;
      hardStop();
      window.removeEventListener("pagehide", hardStop);
      window.removeEventListener("beforeunload", hardStop);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [stopPlayback]);

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
        return next;
      });
      if (persist && userId) setStreak(bumpStreak(userId));
      if (!persist) return;
      void fetch("/api/player/audio/learned", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_slug: slug, phrase_id: phraseId }),
      }).catch(() => undefined);
    },
    [slug, persist, userId],
  );

  const flashHighlight = useCallback((phraseId: string, lang: LangTrack) => {
    setActivePhraseId(phraseId);
    setActiveLang(lang);
    setCardLit(true);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setCardLit(false), 1500);
  }, []);

  useEffect(() => {
    if (!activePhraseId || view !== "phrasebook") return;
    const el = phraseElsRef.current.get(activePhraseId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [activePhraseId, playing, view]);

  const scheduleChain = useCallback((fn: () => void, ms: number) => {
    if (chainTimer.current) window.clearTimeout(chainTimer.current);
    chainTimer.current = window.setTimeout(fn, ms);
  }, []);

  const playQuizClip = useCallback(
    (q: QuizQuestion) => {
      if (!q.speak_text && !q.audio_url) return;
      cancelSpeech();
      const existing = audioRef.current;
      if (existing) {
        try {
          existing.pause();
        } catch {
          /* ignore */
        }
      }
      if (q.speak_lang === "de" && q.audio_url) {
        if (!audioRef.current) audioRef.current = new Audio();
        const el = audioRef.current;
        el.src = q.audio_url;
        el.playbackRate = speedRef.current;
        void el.play().catch(() => undefined);
        return;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window && q.speak_text) {
        const utter = new SpeechSynthesisUtterance(q.speak_text);
        utter.lang = q.speak_lang === "en" ? "en-US" : "de-DE";
        utter.rate = speedRef.current;
        window.speechSynthesis.speak(utter);
      }
    },
    [],
  );

  const playTrack = useCallback(
    (phrase: Phrase, lang: LangTrack, chain = false) => {
      if (!mountedRef.current) return;
      const session = playSession.current + 1;
      playSession.current = session;

      if (chainTimer.current) {
        window.clearTimeout(chainTimer.current);
        chainTimer.current = null;
      }
      cancelSpeech();
      const existing = audioRef.current;
      if (existing) {
        existing.onended = null;
        existing.onerror = null;
        try {
          existing.pause();
        } catch {
          /* ignore */
        }
      }

      flashHighlight(phrase.id, lang);
      markLearned(phrase.id);
      setPlaying(true);

      const stillActive = () => mountedRef.current && playSession.current === session;

      const finish = () => {
        if (!stillActive()) return;
        setPlaying(false);
        const list = phrasesRef.current;
        const idx = list.findIndex((p) => p.id === phrase.id);
        if (autoPlayRef.current || chain) {
          const next = list[idx + 1];
          if (next) scheduleChain(() => playTrack(next, lang, true), 350);
          return;
        }
        if (repeatRef.current) scheduleChain(() => playTrack(phrase, lang), 250);
      };

      if (lang === "de" && phrase.audio_url) {
        if (!audioRef.current) audioRef.current = new Audio();
        const el = audioRef.current;
        el.onended = () => {
          if (stillActive()) finish();
        };
        el.onerror = () => {
          if (stillActive()) setPlaying(false);
        };
        el.src = phrase.audio_url;
        el.playbackRate = speedRef.current;
        void el.play().catch(() => {
          if (stillActive()) setPlaying(false);
        });
        return;
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(lang === "en" ? phrase.source_text : phrase.target_text);
        utter.lang = lang === "en" ? "en-US" : "de-DE";
        utter.rate = speedRef.current;
        utter.onend = () => {
          if (stillActive()) finish();
        };
        utter.onerror = () => {
          if (stillActive()) setPlaying(false);
        };
        window.speechSynthesis.speak(utter);
        return;
      }

      scheduleChain(finish, 1500);
    },
    [flashHighlight, markLearned, scheduleChain],
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

  useEffect(() => {
    if (view !== "assessment" || quizDone || checked) return;
    const q = quiz[qIndex];
    if (!q || q.kind !== "listen") return;
    const t = window.setTimeout(() => playQuizClip(q), 450);
    return () => window.clearTimeout(t);
  }, [view, quiz, qIndex, quizDone, checked, playQuizClip]);

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
        if (persist) {
          void fetch("/api/player/audio/assessment", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              course_slug: slug,
              module_key: activeModule.id,
              score_pct: pct,
            }),
          }).catch(() => undefined);
        }
      }
      if (persist && userId) setStreak(bumpStreak(userId));
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

  const currentQ = quiz[qIndex];
  const quizProgress = quiz.length ? ((qIndex + (checked ? 1 : 0)) / quiz.length) * 100 : 0;

  return (
    <div
      className="classroom-room flex h-[100dvh] max-h-[100dvh] overflow-hidden antialiased"
      data-theme={theme}
    >
      {sidebarOpen ? (
        <button
          type="button"
          className="cr-overlay fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`cr-surface fixed inset-y-0 left-0 z-50 flex w-56 max-w-[78vw] flex-col border-r transition-transform duration-300 lg:static lg:w-56 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="cr-border border-b px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="cr-logo-light">
              <LogoMark className="max-h-7 max-w-[7.5rem]" priority />
            </div>
            <div className="cr-logo-dark">
              <LogoMark variant="inverse" className="max-h-7 max-w-[7.5rem]" priority />
            </div>
            <button
              type="button"
              className="cr-muted rounded-lg p-1 hover:opacity-80 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="cr-text mt-1.5 truncate text-xs font-semibold">{data.course_title}</p>
          <p className="cr-faint text-[0.65rem]">Audio classroom</p>
        </div>

        <div className="hide-scrollbar flex-1 space-y-1 overflow-y-auto px-2 py-3">
          <p className="cr-faint px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]">
            Modules
          </p>
          {moduleMeta.map((mod, i) => {
            const selectedMod = mod.id === activeModule.id;
            const pct = mod.phrases.length
              ? Math.round((mod.learnedCount / mod.phrases.length) * 100)
              : 0;
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
                className={`relative w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  mod.locked
                    ? "cursor-not-allowed border-transparent opacity-45"
                    : selectedMod
                      ? "cr-accent-soft border"
                      : "cr-hover border-transparent"
                }`}
              >
                {selectedMod && !mod.locked ? (
                  <span className="cr-accent-bg absolute inset-y-1.5 left-0 w-0.5 rounded-full" />
                ) : null}
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.65rem] font-bold ${
                      selectedMod ? "cr-accent-bg" : "cr-surface-soft cr-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="cr-text truncate text-[0.8rem] font-semibold leading-tight">
                        {mod.title}
                      </p>
                      {mod.locked ? (
                        <Lock className="cr-faint h-3 w-3 shrink-0" />
                      ) : mod.result?.passed ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                      ) : null}
                    </div>
                    {!mod.locked ? (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="cr-surface-soft h-1 flex-1 overflow-hidden rounded-full opacity-40">
                          <div className="cr-accent-bg h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="cr-faint shrink-0 text-[0.65rem] tabular-nums">
                          {mod.learnedCount}/{mod.phrases.length}
                          {mod.result ? ` · ${mod.result.scorePct}%` : ""}
                        </span>
                      </div>
                    ) : (
                      <p className="cr-faint mt-0.5 text-[0.65rem]">Locked</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="cr-accent-soft m-2 rounded-xl border px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Flame className="cr-accent h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="cr-text text-xs font-bold">
                {streak > 0 ? `${streak} day streak` : "Start a streak"}
              </p>
              <p className="cr-muted text-[0.65rem]">
                {streak > 0 ? "Keep it going." : "Practice today."}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="cr-accent-bg h-1 w-full" />
        <header className="cr-surface cr-border sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="cr-border cr-text rounded-xl border p-2 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open modules"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <Link
              href={preview ? `/dashboard/instructor/studio/${slug}` : "/dashboard/courses"}
              onClick={() => stopPlayback()}
              className="cr-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {preview ? "Studio" : "My courses"}
            </Link>
            <h1 className="cr-text truncate font-display text-lg font-bold sm:text-xl">
              M{activeModule.index + 1}: {activeModule.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="cr-border cr-text rounded-xl border p-2 transition hover:opacity-90"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="cr-yellow h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="cr-accent-soft flex rounded-2xl border p-1">
            <button
              type="button"
              onClick={() => {
                setView("phrasebook");
                stopPlayback();
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 sm:px-4 ${
                view === "phrasebook" ? "cr-accent-bg shadow-sm" : "cr-muted"
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
                view === "assessment" ? "cr-accent-bg shadow-sm" : "cr-muted"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assessment</span>
            </button>
          </div>
        </header>

        {view === "phrasebook" ? (
          <>
            <div ref={listScrollRef} className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-36 pt-5 sm:px-6">
              <ul className="mx-auto max-w-3xl space-y-3">
                {phrases.map((phrase, idx) => {
                  const litNow = activePhraseId === phrase.id && (playing || cardLit);
                  return (
                    <li
                      key={phrase.id}
                      ref={(node) => {
                        if (node) phraseElsRef.current.set(phrase.id, node);
                        else phraseElsRef.current.delete(phrase.id);
                      }}
                      className={`cr-surface flex scroll-mt-28 items-center gap-4 rounded-2xl border px-4 py-4 transition-all duration-300 sm:px-5 ${
                        litNow ? "cr-card-active border-l-4 shadow-md" : "hover:opacity-95"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            litNow ? "cr-accent-bg" : "cr-surface-soft cr-muted"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 space-y-1.5">
                          <div>
                            <p className="cr-yellow text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                              English
                            </p>
                            <p className="cr-yellow mt-0.5 text-base font-semibold leading-snug sm:text-lg">
                              {phrase.source_text}
                            </p>
                          </div>
                          <div>
                            <p className="cr-blue text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                              German
                            </p>
                            <p className="cr-blue mt-0.5 font-display text-xl font-bold tracking-tight sm:text-2xl">
                              {phrase.target_text}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() => playTrack(phrase, "en")}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-300 ${
                            litNow && activeLang === "en" ? "cr-en-btn-active" : "cr-en-btn"
                          }`}
                          aria-label="Play English"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => playTrack(phrase, "de")}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all duration-300 ${
                            litNow && activeLang === "de" ? "cr-de-btn-active" : "cr-de-btn"
                          }`}
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
                <p className="cr-muted py-16 text-center text-sm">No phrases in this module yet.</p>
              ) : null}
            </div>

            <div className="cr-surface cr-border absolute inset-x-0 bottom-0 z-20 border-t px-4 py-3 backdrop-blur-xl sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!activePhrase) return;
                    if (playing) stopPlayback();
                    else playTrack(activePhrase, activeLang, true);
                  }}
                  className="cr-accent-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform duration-300 hover:scale-105"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${activeLang === "en" ? "cr-yellow" : "cr-blue"}`}>
                    {autoPlay ? "Auto-play next" : "Now playing"}
                    {activePhrase ? ` · ${activeLang === "en" ? "English" : "German"}` : ""}
                  </p>
                  <p className={`truncate text-sm font-semibold ${activeLang === "en" ? "cr-yellow" : "cr-blue"}`}>
                    {activePhrase
                      ? activeLang === "en"
                        ? activePhrase.source_text
                        : activePhrase.target_text
                      : "Ready to start"}
                  </p>
                  {activePhrase ? (
                    <p className={`truncate text-xs ${activeLang === "en" ? "cr-blue" : "cr-yellow"}`}>
                      {activeLang === "en" ? activePhrase.target_text : activePhrase.source_text}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    disabled={activeIndex <= 0}
                    onClick={() => {
                      const prev = phrases[activeIndex - 1];
                      if (prev) playTrack(prev, activeLang, true);
                    }}
                    className="cr-muted cr-hover rounded-xl p-2 transition disabled:opacity-30"
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
                    className="cr-muted cr-hover rounded-xl p-2 transition disabled:opacity-30"
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
                        speed === s ? "cr-accent-bg" : "cr-surface-soft cr-muted"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRepeat((v) => !v)}
                    className={`rounded-xl p-2 transition-all duration-300 ${
                      repeat ? "cr-accent-soft" : "cr-muted cr-hover"
                    }`}
                    aria-label="Repeat"
                  >
                    <Repeat className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoPlay((v) => !v)}
                    className={`rounded-xl px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide transition-all duration-300 ${
                      autoPlay ? "cr-accent-bg" : "cr-surface-soft cr-muted"
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
            <div className="cr-surface cr-border w-full max-w-2xl rounded-3xl border p-6 shadow-xl sm:p-8">
              {quiz.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="cr-muted text-sm">Add more phrases to this module to unlock an assessment.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setView("phrasebook");
                      stopPlayback();
                    }}
                    className="cr-accent mt-4 text-sm font-semibold"
                  >
                    Back to phrasebook
                  </button>
                </div>
              ) : quizDone ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="cr-accent-soft flex h-20 w-20 items-center justify-center rounded-full">
                    <Trophy className="cr-accent h-10 w-10" />
                  </div>
                  <h2 className="cr-text mt-6 font-display text-3xl font-bold">
                    {finalScorePct >= PASS_MARK ? "Module Complete!" : "Keep practicing"}
                  </h2>
                  <p className="cr-muted mt-2 text-sm">
                    You scored <span className="cr-text font-bold">{finalScorePct}%</span>
                    {finalScorePct >= PASS_MARK
                      ? " - next module unlocked."
                      : ` - need ${PASS_MARK}% to unlock the next module.`}
                  </p>
                  <p className="cr-faint mt-1 text-xs">
                    {scoreCorrect} of {quiz.length} correct · 15 text + 5 listening
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => startAssessment()}
                      className="cr-accent-bg rounded-2xl px-6 py-3 text-sm font-bold transition hover:opacity-90"
                    >
                      Retake Assessment
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setView("phrasebook");
                        stopPlayback();
                      }}
                      className="cr-border cr-text cr-hover rounded-2xl border px-6 py-3 text-sm font-bold transition"
                    >
                      Back to Phrasebook
                    </button>
                  </div>
                </div>
              ) : currentQ ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="cr-faint text-[0.7rem] font-semibold uppercase tracking-[0.16em]">
                      Question {qIndex + 1} of {quiz.length}
                    </p>
                    <span className="cr-surface-soft cr-text inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
                      <Star className="cr-accent h-3.5 w-3.5" />
                      {Math.round((scoreCorrect / Math.max(quiz.length, 1)) * 100)}%
                    </span>
                  </div>
                  <div className="cr-surface-soft mt-3 h-2 overflow-hidden rounded-full opacity-40">
                    <div
                      className="cr-accent-bg h-full rounded-full transition-all duration-300"
                      style={{ width: `${quizProgress}%` }}
                    />
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    {currentQ.kind === "listen" ? (
                      <span className="cr-de-btn inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide">
                        <Headphones className="h-3.5 w-3.5" />
                        Listening
                      </span>
                    ) : null}
                  </div>

                  <h2 className="cr-text mt-4 font-display text-2xl font-bold leading-snug sm:text-3xl">
                    {currentQ.prompt}
                  </h2>

                  {currentQ.kind === "listen" ? (
                    <button
                      type="button"
                      onClick={() => playQuizClip(currentQ)}
                      className="cr-de-btn-active mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition hover:opacity-90"
                    >
                      <Volume2 className="h-4 w-4" />
                      Play audio again
                    </button>
                  ) : null}

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
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                              : showWrong
                                ? "border-red-400 bg-red-500/15 text-red-400"
                                : isSel
                                  ? "cr-accent-soft"
                                  : "cr-border cr-surface-soft cr-text"
                          }`}
                        >
                          <span>{opt.text}</span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                              isSel || showCorrect ? "cr-accent-bg border-transparent" : "cr-border"
                            }`}
                          >
                            {(isSel || showCorrect) && (
                              <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="cr-border mt-8 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-h-[1.5rem] text-sm font-semibold">
                      {checked ? (
                        selected === currentQ.correct_option_id ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-red-400">
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
                        className="cr-accent-bg rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-300 hover:opacity-90 disabled:opacity-40"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onContinue}
                        className="cr-border cr-text cr-hover rounded-2xl border px-6 py-3 text-sm font-bold transition-all duration-300"
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
