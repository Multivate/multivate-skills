"use client";

import { ChevronLeft, Pause, Play, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/layout/LogoMark";
import { ListenFollowAlong, listenSceneSrc } from "@/components/player/ListenFollowAlong";
import {
  LISTEN_DURATIONS,
  buildListenStory,
  estimatedMinutes,
  finishedModuleIds,
  moduleLabel,
  type ListenDuration,
  type ListenStory,
  type StoryModule,
} from "@/lib/listen-story";
import {
  LISTEN_PACE_RATE,
  loadTeacherVoice,
  speakGerman,
  type ListenPace,
  type TeacherVoice,
} from "@/lib/classroom-prefs";

type Phrasebook = {
  course_title: string;
  cefr_level?: string;
  phrases: {
    id: string;
    section_id: string | null;
    source_text: string;
    target_text: string;
    position?: number;
  }[];
  sections: { id: string; title: string; position: number }[];
  learned_phrase_ids?: string[];
  module_assessments?: { module_key: string; passed: boolean }[];
};

const PACES: { id: ListenPace; label: string }[] = [
  { id: "slow", label: "Slow" },
  { id: "medium", label: "Natural" },
  { id: "fast", label: "Fluent" },
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function ClassroomListenAlone({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const [book, setBook] = useState<Phrasebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pace, setPace] = useState<ListenPace>("medium");
  const [minutes, setMinutes] = useState<ListenDuration>(10);
  const [moduleId, setModuleId] = useState("");
  const [story, setStory] = useState<ListenStory | null>(null);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [teacher, setTeacher] = useState<TeacherVoice>("female");
  const playingRef = useRef(false);
  const storyRef = useRef<ListenStory | null>(null);
  const beatRef = useRef(0);
  const paceRef = useRef(pace);
  const genRef = useRef(0);
  const boundaryRef = useRef(false);
  const rafRef = useRef(0);
  paceRef.current = pace;
  storyRef.current = story;
  beatRef.current = beat;
  playingRef.current = playing;

  const qs = preview ? "?preview=true" : "";
  const classroomHref = `/learn/${slug}${preview ? "?preview=1" : ""}`;

  useEffect(() => {
    setTeacher(loadTeacherVoice());
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/player/${encodeURIComponent(slug)}/phrasebook${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setError(typeof body?.detail === "string" ? body.detail : "We could not open the listening session.");
        return;
      }
      setBook(body as Phrasebook);
    })();
    return () => {
      cancelled = true;
      genRef.current += 1;
      window.cancelAnimationFrame(rafRef.current);
      window.speechSynthesis?.cancel();
    };
  }, [slug, qs]);

  const modules: StoryModule[] = (() => {
    if (!book) return [];
    const phrases = [...(book.phrases ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const sections = [...(book.sections ?? [])].sort((a, b) => a.position - b.position);
    if (!sections.length) {
      return [{ id: "main", title: "Module 1", phrases }];
    }
    return sections
      .map((section) => ({
        id: section.id,
        title: section.title,
        phrases: phrases.filter((row) => row.section_id === section.id),
      }))
      .filter((row) => row.phrases.length);
  })();

  const learned = new Set((book?.learned_phrase_ids ?? []).map(String));
  const passed = new Set(
    (book?.module_assessments ?? []).filter((row) => row.passed).map((row) => row.module_key),
  );
  const doneIds = finishedModuleIds(modules, learned, passed);

  function haltSpeech() {
    genRef.current += 1;
    playingRef.current = false;
    window.cancelAnimationFrame(rafRef.current);
    window.speechSynthesis?.cancel();
  }

  function makeStory(
    nextBook = book,
    nextModules = modules,
    nextModuleId = moduleId,
    nextMinutes = minutes,
  ) {
    if (!nextBook || !nextModules.length) return;
    const nextLearned = new Set((nextBook.learned_phrase_ids ?? []).map(String));
    const nextPassed = new Set(
      (nextBook.module_assessments ?? []).filter((row) => row.passed).map((row) => row.module_key),
    );
    const chosen =
      nextModules.some((row) => row.id === nextModuleId) ? nextModuleId : nextModules[0]?.id ?? "";
    haltSpeech();
    setPlaying(false);
    setBeat(0);
    setCursor(0);
    setStory(
      buildListenStory({
        modules: nextModules,
        learned: nextLearned,
        passed: nextPassed,
        cefr: nextBook.cefr_level || "A1",
        moduleId: chosen,
        minutes: nextMinutes,
      }),
    );
  }

  useEffect(() => {
    if (!book || !modules.length) return;
    if (!moduleId) {
      const start = doneIds[0] ?? modules[0]?.id ?? "";
      setModuleId(start);
      makeStory(book, modules, start);
      return;
    }
    if (!story) makeStory(book, modules, moduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first story when phrasebook arrives
  }, [book, modules.length]);

  function playFrom(index: number) {
    const current = storyRef.current;
    const line = current?.beats[index];
    if (!line) {
      setPlaying(false);
      playingRef.current = false;
      return;
    }
    window.cancelAnimationFrame(rafRef.current);
    const gen = genRef.current + 1;
    genRef.current = gen;
    boundaryRef.current = false;
    setBeat(index);
    setCursor(0);
    setPlaying(true);
    playingRef.current = true;
    const rate = LISTEN_PACE_RATE[paceRef.current];
    const ms = Math.max(1400, (wordCount(line.de) / (118 * rate)) * 60_000);
    const started = performance.now();
    const tick = (now: number) => {
      if (gen !== genRef.current || !playingRef.current) return;
      if (!boundaryRef.current) {
        const frac = Math.min(1, (now - started) / ms);
        setCursor(Math.floor(frac * line.de.length));
      }
      if (now - started < ms + 500) rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    speakGerman(line.de, teacher, "de-DE", {
      rate,
      onboundary: (charIndex) => {
        if (gen !== genRef.current) return;
        if (charIndex > 0) boundaryRef.current = true;
        setCursor(charIndex);
      },
      onend: () => {
        if (gen !== genRef.current) return;
        setCursor(line.de.length);
        if (!playingRef.current) return;
        playFrom(index + 1);
      },
    });
  }

  function togglePlay() {
    if (playing) {
      haltSpeech();
      setPlaying(false);
      return;
    }
    playFrom(beatRef.current);
  }

  function skip(delta: number) {
    const next = Math.min(Math.max(0, beatRef.current + delta), (storyRef.current?.beats.length ?? 1) - 1);
    if (playingRef.current) playFrom(next);
    else {
      haltSpeech();
      setBeat(next);
      setCursor(0);
    }
  }

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

  if (!book || !story) {
    return <p className="py-20 text-center text-sm text-[#10244F]/50">Opening listening studio…</p>;
  }

  const current = story.beats[beat];
  const progress = story.beats.length ? ((beat + (current ? cursor / Math.max(current.de.length, 1) : 0)) / story.beats.length) * 100 : 0;
  const scene = listenSceneSrc(current?.chapter ?? "");

  return (
    <div className="listen-studio flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link href={classroomHref} className="inline-flex items-center gap-1 text-sm font-semibold text-white/80 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Classroom
        </Link>
        <LogoMark variant="inverse" className="max-w-[9rem]" priority />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="relative flex min-h-[28rem] flex-col overflow-hidden rounded-[28px] bg-[#0b1a3d] shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <img src={scene} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#10244F]/40 via-[#10244F]/78 to-[#0b1a3d]" />
          <div className="relative flex min-h-0 flex-1 flex-col p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8eb6ff]">Listening studio</p>
                <h1 className="mt-1 text-lg font-extrabold text-white sm:text-xl">{book.course_title}</h1>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white/80">
                {playing ? (
                  <span className="listen-eq inline-flex h-4 items-end gap-[3px]" aria-hidden>
                    <span className="h-4" />
                    <span className="h-3" />
                    <span className="h-4" />
                    <span className="h-2.5" />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white/40" />
                )}
                {playing ? "Live" : "Paused"}
              </div>
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#8eb6ff]">{current?.chapter}</p>
            <div className="mt-4 flex-1">
              <ListenFollowAlong text={current?.de ?? ""} cursor={cursor} playing={playing} />
              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/55">{current?.en}</p>
            </div>

            <div className="mt-8">
              <div className="h-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-[#1457D0] transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-white/45">
                <span>
                  Scene {beat + 1} of {story.beats.length}
                </span>
                <span>
                  {minutes} min · about {estimatedMinutes(story.beats)} min of German
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => skip(-1)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Previous scene"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex h-16 min-w-[9.5rem] items-center justify-center gap-2 rounded-full bg-[#1457D0] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(20,87,208,0.45)]"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {playing ? "Pause" : "Play story"}
              </button>
              <button
                type="button"
                onClick={() => skip(1)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Next scene"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4 rounded-[28px] bg-white/8 p-5 text-white backdrop-blur-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8eb6ff]">Story</p>
            <p className="mt-2 text-sm font-extrabold">{story.topic}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{story.reason}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Length</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {LISTEN_DURATIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMinutes(item);
                    makeStory(book, modules, moduleId, item);
                  }}
                  className={`rounded-full py-2 text-xs font-bold ${
                    minutes === item ? "bg-[#1457D0] text-white" : "bg-white/10 text-white/80"
                  }`}
                >
                  {item}m
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">Pace</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PACES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPace(item.id);
                    if (playingRef.current) playFrom(beatRef.current);
                  }}
                  className={`rounded-full py-2 text-xs font-bold ${
                    pace === item.id ? "bg-[#1457D0] text-white" : "bg-white/10 text-white/80"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45">
            Module
            <select
              className="mt-2 w-full rounded-[14px] border border-white/15 bg-[#0b1a3d] px-3 py-3 text-sm font-semibold text-white"
              value={moduleId}
              onChange={(event) => {
                const next = event.target.value;
                setModuleId(next);
                makeStory(book, modules, next);
              }}
            >
              {modules.map((row, index) => (
                <option key={row.id} value={row.id}>
                  {moduleLabel(index, row.title)}
                  {doneIds.includes(row.id) ? " (finished)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => makeStory(book, modules, moduleId)}
            className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-semibold text-white"
          >
            <Shuffle className="h-4 w-4" /> New {minutes}-minute story
          </button>
        </aside>
      </div>
    </div>
  );
}
