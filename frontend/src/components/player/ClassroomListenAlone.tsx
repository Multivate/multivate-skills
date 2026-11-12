"use client";

import { Headphones, Pause, Play, Shuffle, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/layout/LogoMark";
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

const PACES: { id: ListenPace; label: string; hint: string }[] = [
  { id: "slow", label: "Slow", hint: "Careful classroom speed" },
  { id: "medium", label: "Medium", hint: "Natural talk" },
  { id: "fast", label: "Fast", hint: "Radio speed" },
];

export function ClassroomListenAlone({ slug, preview = false }: { slug: string; preview?: boolean }) {
  const [book, setBook] = useState<Phrasebook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pace, setPace] = useState<ListenPace>("medium");
  const [minutes, setMinutes] = useState<ListenDuration>(10);
  const [moduleId, setModuleId] = useState("");
  const [story, setStory] = useState<ListenStory | null>(null);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [teacher, setTeacher] = useState<TeacherVoice>("female");
  const playingRef = useRef(false);
  const storyRef = useRef<ListenStory | null>(null);
  const beatRef = useRef(0);
  const paceRef = useRef(pace);
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
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setBeat(0);
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
    if (!current?.beats[index]) {
      setPlaying(false);
      return;
    }
    setBeat(index);
    setPlaying(true);
    playingRef.current = true;
    speakGerman(current.beats[index]!.de, teacher, "de-DE", {
      rate: LISTEN_PACE_RATE[paceRef.current],
      onend: () => {
        if (!playingRef.current) return;
        playFrom(index + 1);
      },
    });
  }

  function togglePlay() {
    if (playing) {
      playingRef.current = false;
      setPlaying(false);
      window.speechSynthesis?.cancel();
      return;
    }
    playFrom(beatRef.current);
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
    return <p className="py-20 text-center text-sm text-[#10244F]/50">Opening listening session…</p>;
  }

  const current = story.beats[beat];

  return (
    <div className="classroom-room mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <Link href={classroomHref} className="text-sm font-semibold text-brand-accent">
          Back to classroom
        </Link>
        <LogoMark className="max-w-[7.5rem]" />
      </header>

      <div className="cr-surface mt-6 rounded-[22px] p-5 shadow-[0_12px_30px_rgba(16,36,79,0.08)]">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1457D0]">
          <Headphones className="h-4 w-4" /> Listening session
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#10244F]">{book.course_title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#10244F]/70">{story.reason}</p>
        <p className="mt-3 text-sm font-semibold text-[#10244F]">Topic: {story.topic}</p>
        <p className="mt-1 text-sm text-[#10244F]/70">
          Chapter: {current?.chapter} · about {estimatedMinutes(story.beats)} minutes at medium speed
        </p>

        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#10244F]/55">Story length</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LISTEN_DURATIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMinutes(item);
                makeStory(book, modules, moduleId, item);
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                minutes === item ? "bg-[#1457D0] text-white" : "cr-chip"
              }`}
            >
              {item} min
            </button>
          ))}
        </div>

        <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#10244F]/55">
          Module
          <select
            className="mt-2 w-full rounded-[14px] border border-[#10244F]/15 bg-white px-3 py-3 text-sm font-semibold text-[#10244F]"
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

        <div className="mt-5 flex flex-wrap gap-2">
          {PACES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPace(item.id);
                if (playingRef.current) playFrom(beatRef.current);
              }}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                pace === item.id ? "bg-[#1457D0] text-white" : "cr-chip"
              }`}
            >
              {item.label}
              <span className="ml-2 text-[11px] font-medium opacity-80">{item.hint}</span>
            </button>
          ))}
        </div>

        <div className="cr-surface-soft mt-6 rounded-[18px] px-4 py-6 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1457D0]">{current?.chapter}</p>
          <p className="mt-3 text-[1.15rem] font-semibold leading-relaxed text-[#10244F] sm:text-xl">{current?.de}</p>
          <p className="mt-3 text-sm leading-relaxed text-[#10244F]/65">{current?.en}</p>
          <p className="mt-4 text-xs font-semibold text-[#10244F]/45">
            Scene {beat + 1} of {story.beats.length} · keep playing for the full {minutes}-minute story
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex h-14 items-center gap-2 rounded-full bg-[#1457D0] px-6 text-sm font-semibold text-white"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {playing ? "Pause" : "Play story"}
          </button>
          <button
            type="button"
            onClick={() => playFrom(beat)}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#10244F] text-white"
            aria-label="Play this line"
          >
            <Volume2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => makeStory(book, modules, moduleId)}
            className="inline-flex h-14 items-center gap-2 rounded-full border border-[#10244F]/15 px-5 text-sm font-semibold text-[#10244F]"
          >
            <Shuffle className="h-4 w-4" /> New story at {minutes} min
          </button>
        </div>
      </div>
    </div>
  );
}
