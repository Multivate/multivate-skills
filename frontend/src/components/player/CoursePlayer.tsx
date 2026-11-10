"use client";

import { Link } from "@/i18n/navigation";
import { CheckCircle2, ChevronLeft, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AssessmentPlayer } from "@/components/player/AssessmentPlayer";
import { ClassroomGuide } from "@/components/player/ClassroomGuide";
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
  locked?: boolean;
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
    embed_url: string | null;
    direct_video_url: string | null;
    stream_token: string | null;
    quiz_json: string | null;
    live_url: string | null;
  };
  progress: { position_seconds: number; completed: boolean };
  next_lesson_id: string | null;
};

type Props = {
  slug: string;
  lessonId: string;
  preview?: boolean;
};

export function CoursePlayer({ slug, lessonId, preview = false }: Props) {
  const t = useTranslations("classroom");
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
      setDetail(null);
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

  const markDone = useCallback(async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await fetch("/api/player/progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: detail.lesson.id,
          position_seconds: 0,
          watch_time_seconds: 0,
          completed: true,
        }),
      });
      await loadCurriculum();
      await loadLesson();
    } finally {
      setSaving(false);
    }
  }, [detail, loadCurriculum, loadLesson]);

  const weekSteps = useMemo(() => {
    if (!curriculum) return [];
    return [...curriculum.lessons].sort((a, b) => a.position - b.position);
  }, [curriculum]);

  const lockedMeta = curriculum?.lessons.find((l) => l.id === lessonId);

  if (error && !detail) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        {lockedMeta?.locked ? <Lock className="h-8 w-8 text-brand-ink/40" /> : null}
        <p className="max-w-md text-sm text-brand-ink/70">{error}</p>
        <Link href="/dashboard" className="text-sm font-semibold text-brand-accent hover:underline">
          {t("backDesk")}
        </Link>
      </div>
    );
  }

  if (!curriculum || !detail) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="animate-pulse text-sm font-medium text-neutral-500">{t("opening")}</p>
      </div>
    );
  }

  const isQuiz = detail.lesson.lesson_type === "quiz";
  const streamSrc = detail.lesson.stream_token
    ? `/api/media/stream?token=${encodeURIComponent(detail.lesson.stream_token)}`
    : null;
  const hasVideo = Boolean(streamSrc || detail.lesson.embed_url || detail.lesson.direct_video_url || detail.lesson.live_url);
  const currentIndex = Math.max(0, weekSteps.findIndex((row) => row.id === lessonId));
  const mentorHref = `/dashboard/book-1on1?course=${encodeURIComponent(slug)}&lesson=${encodeURIComponent(detail.lesson.id)}&stuck=1`;

  return (
    <div className="min-h-[100dvh] bg-[#F3F6FA] text-[#10244F]">
      <ClassroomGuide
        courseSlug={slug}
        courseTitle={curriculum.course_title}
        lessonId={detail.lesson.id}
        lessonTitle={detail.lesson.title}
        preview={preview}
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:py-8">
        <aside>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline">
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("backDesk")}
          </Link>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#10244F]/45">{t("weekSteps")}</p>
          <p className="mt-1 text-sm font-semibold leading-snug">{curriculum.course_title}</p>
          <ol className="mt-3 space-y-1">
            {weekSteps.map((step, index) => (
              <li key={step.id}>
                {step.locked ? (
                  <span className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm text-[#10244F]/35">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="line-clamp-2">{step.title}</span>
                  </span>
                ) : (
                  <Link
                    href={`/learn/${slug}/${step.id}${preview ? "?preview=1" : ""}`}
                    className={`flex items-start gap-2 rounded-[10px] px-2.5 py-2 text-sm ${
                      step.id === lessonId ? "bg-white font-semibold shadow-[0_4px_16px_rgba(16,36,79,0.06)]" : "text-[#10244F]/70 hover:bg-white/70"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        step.completed ? "bg-emerald-600 text-white" : step.id === lessonId ? "bg-brand-accent text-white" : "bg-white text-[#10244F]/45"
                      }`}
                    >
                      {step.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="line-clamp-2">{step.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </aside>

        <main className="rounded-[16px] border border-brand-ink/10 bg-white p-5 shadow-[0_10px_28px_rgba(12,27,74,0.05)] sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">
            {t("todayStep", { current: currentIndex + 1, total: weekSteps.length || 1 })}
          </p>
          <h1 className="mt-1 text-[1.65rem] font-extrabold leading-tight">{detail.lesson.title}</h1>

          {isQuiz ? (
            <div className="mt-6">
              <AssessmentPlayer
                lessonId={detail.lesson.id}
                title={detail.lesson.title}
                quizJson={detail.lesson.quiz_json}
                alreadyCompleted={detail.progress.completed}
                onCompleted={() => {
                  void loadCurriculum();
                  void loadLesson();
                }}
              />
            </div>
          ) : (
            <>
              {detail.lesson.body ? (
                <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-[#10244F]/80">{detail.lesson.body}</p>
              ) : (
                <p className="mt-5 text-[15px] leading-7 text-[#10244F]/70">{t("practiceFallback")}</p>
              )}

              {hasVideo ? (
                <div className="relative mt-6 overflow-hidden rounded-[12px] bg-black">
                  <ProtectedVideoPlayer
                    key={streamSrc ?? detail.lesson.direct_video_url ?? detail.lesson.embed_url ?? lessonId}
                    src={streamSrc ?? detail.lesson.direct_video_url}
                    embedUrl={detail.lesson.embed_url ?? detail.lesson.live_url}
                    title={detail.lesson.title}
                    initialTime={detail.progress.position_seconds}
                    className="aspect-video w-full"
                  />
                </div>
              ) : null}

              <label className="mt-6 block">
                <span className="text-sm font-semibold">{t("attemptLabel")}</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  placeholder={t("attemptPh")}
                  className={`${formTextareaClass} mt-1.5`}
                />
              </label>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={saving || detail.progress.completed}
                  onClick={() => void markDone()}
                  className="inline-flex h-11 items-center justify-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {detail.progress.completed ? t("stepDone") : saving ? t("saving") : t("markDone")}
                </button>
                {detail.next_lesson_id ? (
                  <Link
                    href={`/learn/${slug}/${detail.next_lesson_id}${preview ? "?preview=1" : ""}`}
                    className="inline-flex h-11 items-center justify-center rounded-[5px] border border-brand-ink/15 px-5 text-sm font-semibold"
                  >
                    {t("nextStep")}
                  </Link>
                ) : (
                  <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-[5px] border border-brand-ink/15 px-5 text-sm font-semibold">
                    {t("weekComplete")}
                  </Link>
                )}
                <Link
                  href={mentorHref}
                  className="inline-flex h-11 items-center justify-center rounded-[5px] px-4 text-sm font-semibold text-brand-accent hover:underline"
                >
                  {t("askMentor")}
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
