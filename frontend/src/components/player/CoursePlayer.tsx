"use client";

import { Link } from "@/i18n/navigation";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquare,
  NotebookPen,
  Pause,
  Play,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedVideoPlayer } from "@/components/player/ProtectedVideoPlayer";
import { formTextareaClass } from "@/lib/form-styles";

type LessonRow = {
  id: string;
  section_id: string | null;
  position: number;
  title: string;
  lesson_type: string;
  duration_minutes: number;
  is_previewable: boolean;
  completed: boolean;
  position_seconds: number;
};

type SectionRow = { id: string; title: string; position: number };

type Curriculum = {
  course_slug: string;
  course_title: string;
  image_url: string;
  progress_pct: number;
  sections: SectionRow[];
  lessons: LessonRow[];
};

type LessonDetail = {
  course_slug: string;
  course_title: string;
  lesson: {
    id: string;
    title: string;
    body: string | null;
    lesson_type: string;
    video_source: string | null;
    embed_url: string | null;
    direct_video_url: string | null;
    stream_token: string | null;
    video_duration_seconds: number;
    quiz_json: string | null;
    live_url: string | null;
    resources: { id: string; title: string; file_type: string }[];
  };
  progress: { position_seconds: number; completed: boolean };
  next_lesson_id: string | null;
};

type Props = {
  slug: string;
  lessonId: string;
  preview?: boolean;
};

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

export function CoursePlayer({ slug, lessonId, preview = false }: Props) {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [notes, setNotes] = useState("");
  const [rightTab, setRightTab] = useState<"notes" | "bookmarks" | "downloads" | "discussions">("notes");
  const progressTimer = useRef<number | null>(null);

  const qs = preview ? "?preview=true" : "";

  const loadCurriculum = useCallback(async () => {
    const curRes = await fetch(`/api/player/${encodeURIComponent(slug)}/curriculum${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const curData = await curRes.json().catch(() => null);
    if (!curRes.ok) {
      setError(typeof curData?.detail === "string" ? curData.detail : "We couldn't open this lesson.");
      return false;
    }
    setCurriculum(curData as Curriculum);
    return true;
  }, [slug, qs]);

  const loadLesson = useCallback(async () => {
    setError(null);
    const lesRes = await fetch(`/api/player/${encodeURIComponent(slug)}/lessons/${lessonId}${qs}`, {
      credentials: "include",
      cache: "no-store",
    });
    const lesData = await lesRes.json().catch(() => null);
    if (!lesRes.ok) {
      setError(typeof lesData?.detail === "string" ? lesData.detail : "We couldn't open this lesson.");
      return;
    }
    setDetail(lesData as LessonDetail);
  }, [slug, lessonId, qs]);

  useEffect(() => {
    void loadCurriculum();
  }, [loadCurriculum]);

  useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  const saveProgress = useCallback(
    async (completed = false, positionSeconds?: number) => {
      if (!detail) return;
      const pos = positionSeconds ?? detail.progress.position_seconds;
      await fetch("/api/player/progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: detail.lesson.id,
          position_seconds: Math.floor(pos),
          watch_time_seconds: Math.floor(pos),
          completed,
        }),
      });
    },
    [detail],
  );

  const grouped = useMemo(() => {
    if (!curriculum) return [];
    const sections = [...curriculum.sections].sort((a, b) => a.position - b.position);
    const rows = sections.map((s) => ({
      key: s.id,
      title: s.title,
      lessons: curriculum.lessons.filter((l) => l.section_id === s.id).sort((a, b) => a.position - b.position),
    }));
    const loose = curriculum.lessons.filter((l) => !l.section_id);
    if (loose.length) rows.unshift({ key: "general", title: "General", lessons: loose.sort((a, b) => a.position - b.position) });
    return rows;
  }, [curriculum]);

  const streamSrc =
    detail?.lesson.stream_token != null
      ? `/api/media/stream?token=${encodeURIComponent(detail.lesson.stream_token)}`
      : null;
  const directSrc = detail?.lesson.direct_video_url ?? null;
  const embedSrc = detail?.lesson.embed_url ?? null;

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-900">{error}</p>
        <Link href="/dashboard/courses" className="mt-4 inline-block text-sm font-semibold text-brand-primary">
          Back to my courses
        </Link>
      </div>
    );
  }

  if (!curriculum || !detail) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="animate-pulse text-sm font-medium text-slate-500">Loading your lesson…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-slate-950 lg:flex-row">
      <aside className="w-full border-b border-slate-200 bg-white lg:w-72 lg:border-b-0 lg:border-r dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-accent">Curriculum</p>
          <h1 className="mt-1 font-bold leading-snug text-brand-ink">{curriculum.course_title}</h1>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-accent transition-all" style={{ width: `${curriculum.progress_pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{curriculum.progress_pct}% complete</p>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-3 lg:max-h-[calc(100vh-8rem)]">
          {grouped.map((group) => (
            <div key={group.key} className="mb-4">
              <p className="px-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{group.title}</p>
              <ul className="mt-1 space-y-0.5">
                {group.lessons.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${slug}/${l.id}${preview ? "?preview=1" : ""}`}
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
                        l.id === lessonId ? "bg-violet-50 font-semibold text-brand-primary dark:bg-violet-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {l.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Play className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="line-clamp-2 flex-1">{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="relative aspect-video w-full bg-black">
          {embedSrc || streamSrc || directSrc ? (
            <ProtectedVideoPlayer
              key={streamSrc ?? directSrc ?? embedSrc ?? lessonId}
              src={streamSrc ?? directSrc}
              embedUrl={embedSrc}
              title={detail.lesson.title}
              initialTime={detail.progress.position_seconds}
              playbackRate={speed}
              onTimeUpdate={(seconds) => {
                if (progressTimer.current) window.clearTimeout(progressTimer.current);
                progressTimer.current = window.setTimeout(() => void saveProgress(false, seconds), 4000);
              }}
              onEnded={() => void saveProgress(true)}
            />
          ) : detail.lesson.live_url ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-white">
              <p className="text-sm">Live session</p>
              <ProtectedVideoPlayer embedUrl={detail.lesson.live_url} title={detail.lesson.title} className="max-h-full w-full" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-white/80">
              <Pause className="mr-2 h-5 w-5" /> No video for this lesson yet
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500">Speed</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                speed === s ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}x
            </button>
          ))}
          {detail.next_lesson_id ? (
            <Link
              href={`/learn/${slug}/${detail.next_lesson_id}${preview ? "?preview=1" : ""}`}
              className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"
            >
              Next lesson <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6 lg:flex-row">
          <article className="flex-1">
            <h2 className="text-xl font-extrabold text-brand-ink">{detail.lesson.title}</h2>
            {detail.lesson.body ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{detail.lesson.body}</p> : null}
          </article>

          <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:w-80">
            <div className="flex gap-1 border-b border-slate-100 pb-2 dark:border-slate-800">
              {(
                [
                  ["notes", NotebookPen],
                  ["bookmarks", Bookmark],
                  ["downloads", Download],
                  ["discussions", MessageSquare],
                ] as const
              ).map(([id, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRightTab(id)}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-bold uppercase ${
                    rightTab === id ? "bg-violet-50 text-brand-primary" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {id}
                </button>
              ))}
            </div>
            {rightTab === "notes" ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                placeholder="Jot down ideas as you learn…"
                className={formTextareaClass}
              />
            ) : null}
            {rightTab === "downloads" ? (
              <ul className="mt-3 space-y-2 text-sm">
                {detail.lesson.resources.length === 0 ? (
                  <li className="text-slate-500">No files for this lesson.</li>
                ) : (
                  detail.lesson.resources.map((r) => (
                    <li key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                      {r.title}
                    </li>
                  ))
                )}
              </ul>
            ) : null}
            {rightTab === "bookmarks" ? <p className="mt-3 text-sm text-slate-500">Bookmarks are coming soon. Your place in the video is saved automatically.</p> : null}
            {rightTab === "discussions" ? <p className="mt-3 text-sm text-slate-500">Course discussions will show up here soon.</p> : null}
          </aside>
        </div>
      </main>
    </div>
  );
}
