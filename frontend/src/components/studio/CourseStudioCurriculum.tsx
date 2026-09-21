"use client";

import { ClipboardList, GripVertical, Loader2, Plus, Trash2, Upload as UploadIcon, Video, Link2 } from "lucide-react";
import { Upload } from "@/components/ui/Upload";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedVideoPlayer } from "@/components/player/ProtectedVideoPlayer";
import {
  StudioPanel,
  studioFieldClass,
  studioLabelClass,
} from "@/components/studio/studio-ui";
import {
  nextWeekTitle,
  readDoneWeekIds,
  readStoredWeekId,
  writeDoneWeekIds,
  writeStoredWeekId,
} from "@/lib/studio-weeks";

type Section = { id: string; title: string; position: number };
type Resource = { id: string; title: string; file_type: string; file_size_bytes: number };
type Lesson = {
  id: string;
  section_id: string | null;
  position: number;
  title: string;
  body: string | null;
  lesson_type: string;
  video_source: string | null;
  video_url: string | null;
  video_duration_seconds: number;
  quiz_json: string | null;
  live_url: string | null;
  is_previewable: boolean;
  duration_minutes: number;
  resources: Resource[];
};

type QuizOption = { id: string; text: string };
type QuizQuestion = { id: string; prompt: string; options: QuizOption[]; correct_option_id: string };
type QuizData = { passing_score_pct: number; questions: QuizQuestion[] };

type CourseDetail = {
  id: string;
  slug: string;
  sections: Section[];
  lessons: Lesson[];
};

type VideoSource = "upload" | "youtube" | "vimeo" | "url";

type Props = {
  slug: string;
  course: CourseDetail;
  busy: boolean;
  uploadPct: number | null;
  setBusy: (v: boolean) => void;
  setUploadPct: (v: number | null) => void;
  setError: (v: string | null) => void;
  loadCourse: (s: string) => Promise<void>;
  showToast: (msg: string) => void;
  onContinueToReview: () => void;
};

function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` : null;
}

function vimeoEmbed(url: string) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

function directVideoUrl(source: string | null, url: string | null) {
  if (!url || source !== "url") return null;
  if (youtubeEmbed(url) || vimeoEmbed(url)) return null;
  return url;
}

function emptyQuestion(): QuizQuestion {
  const qid = `q_${Math.random().toString(36).slice(2, 9)}`;
  const a = `a_${Math.random().toString(36).slice(2, 7)}`;
  const b = `b_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id: qid,
    prompt: "",
    options: [
      { id: a, text: "" },
      { id: b, text: "" },
    ],
    correct_option_id: a,
  };
}

function parseQuiz(raw: string | null): QuizData {
  if (!raw) return { passing_score_pct: 70, questions: [emptyQuestion()] };
  try {
    const data = JSON.parse(raw) as QuizData;
    return {
      passing_score_pct: Number(data.passing_score_pct) || 70,
      questions: Array.isArray(data.questions) && data.questions.length ? data.questions : [emptyQuestion()],
    };
  } catch {
    return { passing_score_pct: 70, questions: [emptyQuestion()] };
  }
}

export function CourseStudioCurriculum({
  slug,
  course,
  busy,
  setBusy,
  setError,
  loadCourse,
  showToast,
  onContinueToReview,
}: Props) {
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonSection, setNewLessonSection] = useState<string>("");
  const [currentWeekId, setCurrentWeekId] = useState<string | null>(null);
  const [doneWeekIds, setDoneWeekIds] = useState<string[]>([]);
  const [newItemKind, setNewItemKind] = useState<"lesson" | "assessment">("lesson");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const dragLesson = useRef<string | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [videoSource, setVideoSource] = useState<VideoSource>("upload");
  const [videoLink, setVideoLink] = useState("");
  const [isPreviewable, setIsPreviewable] = useState(false);
  const [quizDraft, setQuizDraft] = useState<QuizData>({ passing_score_pct: 70, questions: [emptyQuestion()] });
  const [previewStream, setPreviewStream] = useState<string | null>(null);
  const [previewEmbed, setPreviewEmbed] = useState<string | null>(null);
  const [previewDirect, setPreviewDirect] = useState<string | null>(null);

  const activeLesson = useMemo(
    () => course.lessons.find((l) => l.id === selectedLessonId) ?? course.lessons[0] ?? null,
    [course.lessons, selectedLessonId],
  );

  useEffect(() => {
    if (!activeLesson) return;
    setEditTitle(activeLesson.title);
    setEditBody(activeLesson.body ?? "");
    setVideoSource((activeLesson.video_source as VideoSource) || "upload");
    setVideoLink(activeLesson.video_url ?? "");
    setIsPreviewable(activeLesson.is_previewable);
    setQuizDraft(parseQuiz(activeLesson.quiz_json));
  }, [activeLesson?.id]);

  useEffect(() => {
    if (!activeLesson || !slug) {
      setPreviewStream(null);
      setPreviewEmbed(null);
      setPreviewDirect(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      if (activeLesson.video_source === "upload" && activeLesson.video_url) {
        const res = await fetch(
          `/api/player/${encodeURIComponent(slug)}/lessons/${activeLesson.id}?preview=true`,
          { credentials: "include", cache: "no-store" },
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const token = (data as { lesson?: { stream_token?: string } })?.lesson?.stream_token;
        setPreviewStream(token ? `/api/media/stream?token=${encodeURIComponent(token)}` : null);
        setPreviewEmbed(null);
        setPreviewDirect(null);
        return;
      }

      const url = activeLesson.video_url ?? "";
      setPreviewStream(null);
      if (activeLesson.video_source === "youtube") {
        setPreviewEmbed(youtubeEmbed(url));
        setPreviewDirect(null);
      } else if (activeLesson.video_source === "vimeo") {
        setPreviewEmbed(vimeoEmbed(url));
        setPreviewDirect(null);
      } else if (activeLesson.video_source === "url") {
        setPreviewEmbed(null);
        setPreviewDirect(directVideoUrl("url", url));
      } else {
        setPreviewEmbed(null);
        setPreviewDirect(null);
      }
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [activeLesson, slug]);

  const groupedLessons = useMemo(() => {
    const sections = [...course.sections].sort((a, b) => a.position - b.position);
    return sections.map((s) => ({
      key: s.id,
      title: s.title,
      lessons: course.lessons.filter((l) => l.section_id === s.id).sort((a, b) => a.position - b.position),
    }));
  }, [course]);

  useEffect(() => {
    setDoneWeekIds(readDoneWeekIds(slug));
    const stored = readStoredWeekId(slug);
    const weeks = [...course.sections].sort((a, b) => a.position - b.position);
    if (stored && weeks.some((w) => w.id === stored)) {
      setCurrentWeekId(stored);
      setNewLessonSection(stored);
      return;
    }
    const done = new Set(readDoneWeekIds(slug));
    const open = weeks.find((w) => !done.has(w.id)) ?? weeks[weeks.length - 1] ?? null;
    setCurrentWeekId(open?.id ?? null);
    if (open?.id) setNewLessonSection(open.id);
  }, [slug, course.sections]);

  const addSection = async () => {
    const title = nextWeekTitle(course.sections.map((s) => s.title));
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "Could not add that week.");
        return;
      }
      const created = data as { id?: string };
      if (created?.id) {
        setCurrentWeekId(created.id);
        setNewLessonSection(created.id);
        writeStoredWeekId(slug, created.id);
      }
      await loadCourse(slug);
      showToast(`${title} is ready`);
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async () => {
    if (!newLessonTitle.trim()) return;
    setBusy(true);
    try {
      const sectionId =
        newLessonSection && newLessonSection !== "loose" ? newLessonSection : currentWeekId;
      const isAssessment = newItemKind === "assessment";
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/lessons`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          title: newLessonTitle.trim(),
          lesson_type: isAssessment ? "quiz" : "video",
          video_source: isAssessment ? null : "upload",
          quiz_json: isAssessment
            ? JSON.stringify({ passing_score_pct: 70, questions: [emptyQuestion()] })
            : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't add that item.");
        return;
      }
      setNewLessonTitle("");
      await loadCourse(slug);
      setSelectedLessonId((data as { id: string }).id);
      showToast(isAssessment ? "Assessment added" : "Lesson added");
    } finally {
      setBusy(false);
    }
  };

  const updateLesson = useCallback(
    async (lessonId: string, patch: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/studio/lessons/${lessonId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(typeof data?.detail === "string" ? data.detail : "We couldn't update that lesson.");
          return false;
        }
        await loadCourse(slug);
        showToast("Saved");
        return true;
      } finally {
        setBusy(false);
      }
    },
    [loadCourse, setBusy, setError, showToast, slug],
  );

  const deleteLesson = async (lessonId: string) => {
    if (!window.confirm("Remove this item? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/lessons/${lessonId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't remove that lesson.");
        return;
      }
      if (selectedLessonId === lessonId) setSelectedLessonId(null);
      await loadCourse(slug);
      showToast("Lesson removed");
    } finally {
      setBusy(false);
    }
  };

  const saveVideoLink = async () => {
    if (!activeLesson) return;
    const link = videoLink.trim();
    if (videoSource !== "upload" && !link) {
      setError("Paste a video link first.");
      return;
    }
    await updateLesson(activeLesson.id, {
      video_source: videoSource,
      video_url: videoSource === "upload" ? activeLesson.video_url : link,
      lesson_type: "video",
    });
  };

  const saveLessonDetails = async () => {
    if (!activeLesson) return;
    const isQuiz = activeLesson.lesson_type === "quiz";
    if (isQuiz) {
      const cleaned: QuizData = {
        passing_score_pct: Math.min(100, Math.max(1, Number(quizDraft.passing_score_pct) || 70)),
        questions: quizDraft.questions
          .map((q) => ({
            ...q,
            prompt: q.prompt.trim(),
            options: q.options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text),
          }))
          .filter((q) => q.prompt && q.options.length >= 2),
      };
      for (const q of cleaned.questions) {
        if (!q.options.some((o) => o.id === q.correct_option_id)) {
          q.correct_option_id = q.options[0]?.id ?? "";
        }
      }
      if (!cleaned.questions.length) {
        setError("Add at least one question with two answer choices.");
        return;
      }
      await updateLesson(activeLesson.id, {
        title: editTitle.trim(),
        body: editBody.trim() || null,
        lesson_type: "quiz",
        quiz_json: JSON.stringify(cleaned),
        is_previewable: false,
      });
      return;
    }
    await updateLesson(activeLesson.id, {
      title: editTitle.trim(),
      body: editBody.trim() || null,
      is_previewable: isPreviewable,
    });
  };

  const reorderLessons = async (ordered: string[]) => {
    await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/lessons/reorder`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_ids: ordered }),
    });
    await loadCourse(slug);
  };

  const sectionOptions = useMemo(() => {
    return course.sections.map((s) => ({ value: s.id, label: s.title }));
  }, [course.sections]);

  const visibleGroups = groupedLessons.filter((g) => g.key === currentWeekId);
  const hiddenWeeks = groupedLessons.filter((g) => doneWeekIds.includes(g.key) && g.key !== currentWeekId);
  const currentGroup = groupedLessons.find((g) => g.key === currentWeekId);
  const weekReady =
    Boolean(currentGroup) &&
    (currentGroup?.lessons.length ?? 0) > 0 &&
    (currentGroup?.lessons.every((l) => (l.lesson_type === "quiz" ? Boolean(l.quiz_json) : Boolean(l.video_url))) ?? false);

  const markWeekReady = () => {
    if (!currentWeekId) return;
    const nextDone = Array.from(new Set([...doneWeekIds, currentWeekId]));
    setDoneWeekIds(nextDone);
    writeDoneWeekIds(slug, nextDone);
    const remaining = groupedLessons.filter((g) => !nextDone.includes(g.key) && g.key !== currentWeekId);
    if (remaining[0]) {
      setCurrentWeekId(remaining[0].key);
      setNewLessonSection(remaining[0].key);
      writeStoredWeekId(slug, remaining[0].key);
      return;
    }
    void addSection();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-12">
        <StudioPanel
          title={currentGroup?.title ?? "Start with Week 1"}
          description="One week at a time"
          className="xl:col-span-7"
        >
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {hiddenWeeks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hiddenWeeks.map((w) => (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => {
                        setCurrentWeekId(w.key);
                        setNewLessonSection(w.key);
                        writeStoredWeekId(slug, w.key);
                      }}
                      className="rounded-full border border-brand-ink/10 bg-brand-muted/50 px-3 py-1 text-xs text-brand-ink/55"
                    >
                      {w.title} (done)
                    </button>
                  ))}
                </div>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void addSection()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-brand-ink bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New week
              </button>
            </div>

            <div className="border border-brand-ink/10 bg-brand-muted/30 p-4">
              <p className={studioLabelClass}>Add to outline</p>
              <div className="mt-2 flex gap-1 border border-brand-ink/10 bg-brand-surface/70 p-1">
                {(
                  [
                    ["lesson", "Lesson"],
                    ["assessment", "Assessment"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNewItemKind(value)}
                    className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
                      newItemKind === value ? "bg-brand-ink text-white" : "text-brand-ink/55 hover:text-brand-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 lg:flex-row">
                <select
                  value={newLessonSection}
                  onChange={(e) => setNewLessonSection(e.target.value)}
                  className={`lg:w-48 ${studioFieldClass} !mt-0`}
                >
                  <option value="">This week</option>
                  {sectionOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  id="studio-new-lesson-title"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder={newItemKind === "assessment" ? "Assessment title" : "Lesson title"}
                  className={`min-w-0 flex-1 ${studioFieldClass} !mt-0`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void addLesson();
                  }}
                />
                <button
                  type="button"
                  disabled={busy || !newLessonTitle.trim()}
                  onClick={() => void addLesson()}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-accent-dark disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                  {newItemKind === "assessment" ? "Assessment" : "Lesson"}
                </button>
              </div>
              {newItemKind === "assessment" ? (
                <p className="mt-2 text-xs text-brand-ink/50">Shown after students finish this week.</p>
              ) : null}
            </div>

            {groupedLessons.length === 0 ? (
              <div className="border border-dashed border-brand-ink/15 px-6 py-14 text-center">
                <p className="font-display text-xl font-semibold text-brand-ink">Add Week 1</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-brand-ink/55">Then add lessons for that week only.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(visibleGroups.length ? visibleGroups : groupedLessons.slice(0, 1)).map((group) => (
                  <div key={group.key}>
                    <div className="flex items-end justify-between gap-3 border-b border-brand-ink/10 pb-2">
                      <h3 className="font-display text-base font-semibold text-brand-ink">{group.title}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setNewLessonSection(group.key);
                          document.getElementById("studio-new-lesson-title")?.focus();
                        }}
                        className="text-xs font-semibold text-brand-accent hover:text-brand-accent-dark"
                      >
                        Add lesson
                      </button>
                    </div>
                    <ul className="mt-2 divide-y divide-brand-ink/10">
                      {group.lessons.length === 0 ? (
                        <li className="py-4 text-sm text-brand-ink/45">No lessons in this week yet.</li>
                      ) : (
                        group.lessons.map((lesson) => {
                          const selected = (selectedLessonId ?? activeLesson?.id) === lesson.id;
                          const isQuiz = lesson.lesson_type === "quiz";
                          const ready = isQuiz
                            ? Boolean(lesson.quiz_json && lesson.quiz_json.includes("prompt"))
                            : Boolean(lesson.video_url);
                          return (
                            <li
                              key={lesson.id}
                              draggable
                              onDragStart={() => {
                                dragLesson.current = lesson.id;
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (!dragLesson.current) return;
                                const ids = [...course.lessons]
                                  .sort((a, b) => a.position - b.position)
                                  .map((l) => l.id);
                                const from = ids.indexOf(dragLesson.current);
                                const to = ids.indexOf(lesson.id);
                                if (from < 0 || to < 0) return;
                                ids.splice(from, 1);
                                ids.splice(to, 0, dragLesson.current);
                                void reorderLessons(ids);
                              }}
                              onClick={() => setSelectedLessonId(lesson.id)}
                              className={`flex cursor-pointer items-center gap-3 py-3 transition ${
                                selected ? "bg-brand-muted/80" : "hover:bg-brand-muted/40"
                              }`}
                            >
                              <GripVertical className="h-4 w-4 shrink-0 text-brand-ink/30" aria-hidden />
                              {isQuiz ? (
                                <ClipboardList className="h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
                              ) : (
                                <Video className="h-4 w-4 shrink-0 text-brand-ink/45" aria-hidden />
                              )}
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-ink">
                                {lesson.title}
                              </span>
                              <span
                                className={`shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                                  ready ? "text-emerald-700" : "text-amber-800"
                                }`}
                              >
                                {isQuiz ? (ready ? "Assessment" : "Needs questions") : ready ? "Video" : "Needs video"}
                              </span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {weekReady ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => markWeekReady()}
                className="w-full border border-brand-ink bg-brand-surface py-2.5 text-sm font-semibold text-brand-ink"
              >
                This week is ready. Hide it and open the next.
              </button>
            ) : null}
          </div>
        </StudioPanel>

        <StudioPanel
          title={activeLesson?.lesson_type === "quiz" ? "Assessment editor" : "Lesson editor"}
          description={
            activeLesson
              ? activeLesson.lesson_type === "quiz"
                ? "Questions for this week"
                : "Video and notes"
              : "Pick a lesson from this week"
          }
          action={
            activeLesson ? (
              <button
                type="button"
                onClick={() => void deleteLesson(activeLesson.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 transition hover:text-red-900"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Remove
              </button>
            ) : undefined
          }
          className="xl:col-span-5"
        >
          {activeLesson ? (
            <div className="space-y-5">
              <label className="block">
                <span className={studioLabelClass}>Title</span>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={studioFieldClass} />
              </label>

              <label className="block">
                <span className={studioLabelClass}>
                  {activeLesson.lesson_type === "quiz" ? "Instructions" : "Learner notes"}
                </span>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className={`${studioFieldClass} min-h-[5rem] resize-y`}
                />
              </label>

              {activeLesson.lesson_type === "quiz" ? (
                <>
                  <label className="block">
                    <span className={studioLabelClass}>Pass mark (%)</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={quizDraft.passing_score_pct}
                      onChange={(e) =>
                        setQuizDraft((d) => ({
                          ...d,
                          passing_score_pct: Number(e.target.value) || 70,
                        }))
                      }
                      className={studioFieldClass}
                    />
                  </label>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className={studioLabelClass}>Questions</p>
                      <button
                        type="button"
                        onClick={() =>
                          setQuizDraft((d) => ({
                            ...d,
                            questions: [...d.questions, emptyQuestion()],
                          }))
                        }
                        className="text-xs font-semibold text-brand-accent hover:text-brand-accent-dark"
                      >
                        + Add question
                      </button>
                    </div>
                    {quizDraft.questions.map((q, qi) => (
                      <div key={q.id} className="space-y-3 border border-brand-ink/10 bg-brand-muted/20 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <label className="block min-w-0 flex-1">
                            <span className={studioLabelClass}>Question {qi + 1}</span>
                            <textarea
                              value={q.prompt}
                              onChange={(e) => {
                                const prompt = e.target.value;
                                setQuizDraft((d) => ({
                                  ...d,
                                  questions: d.questions.map((item, i) =>
                                    i === qi ? { ...item, prompt } : item,
                                  ),
                                }));
                              }}
                              rows={2}
                              className={`${studioFieldClass} min-h-[3.5rem] resize-y`}
                            />
                          </label>
                          {quizDraft.questions.length > 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setQuizDraft((d) => ({
                                  ...d,
                                  questions: d.questions.filter((_, i) => i !== qi),
                                }))
                              }
                              className="mt-6 text-xs font-semibold text-red-700"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          {q.options.map((opt, oi) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={q.correct_option_id === opt.id}
                                onChange={() =>
                                  setQuizDraft((d) => ({
                                    ...d,
                                    questions: d.questions.map((item, i) =>
                                      i === qi ? { ...item, correct_option_id: opt.id } : item,
                                    ),
                                  }))
                                }
                                title="Mark as correct"
                                className="h-4 w-4 border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
                              />
                              <input
                                value={opt.text}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setQuizDraft((d) => ({
                                    ...d,
                                    questions: d.questions.map((item, i) =>
                                      i === qi
                                        ? {
                                            ...item,
                                            options: item.options.map((o, j) =>
                                              j === oi ? { ...o, text } : o,
                                            ),
                                          }
                                        : item,
                                    ),
                                  }));
                                }}
                                placeholder={`Option ${oi + 1}`}
                                className={`min-w-0 flex-1 ${studioFieldClass} !mt-0`}
                              />
                              {q.options.length > 2 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuizDraft((d) => ({
                                      ...d,
                                      questions: d.questions.map((item, i) => {
                                        if (i !== qi) return item;
                                        const options = item.options.filter((_, j) => j !== oi);
                                        const correct =
                                          item.correct_option_id === opt.id
                                            ? options[0]?.id ?? ""
                                            : item.correct_option_id;
                                        return { ...item, options, correct_option_id: correct };
                                      }),
                                    }))
                                  }
                                  className="text-xs text-brand-ink/45 hover:text-red-700"
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setQuizDraft((d) => ({
                                ...d,
                                questions: d.questions.map((item, i) =>
                                  i === qi
                                    ? {
                                        ...item,
                                        options: [
                                          ...item.options,
                                          {
                                            id: `o_${Math.random().toString(36).slice(2, 8)}`,
                                            text: "",
                                          },
                                        ],
                                      }
                                    : item,
                                ),
                              }))
                            }
                            className="text-xs font-semibold text-brand-ink/55 hover:text-brand-ink"
                          >
                            + Option
                          </button>
                        </div>
                        <p className="text-[0.7rem] text-brand-ink/45">Select the radio next to the correct answer.</p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveLessonDetails()}
                    className="w-full border border-brand-ink bg-brand-ink py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink/90 disabled:opacity-50"
                  >
                    Save assessment
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className={studioLabelClass}>Video source</p>
                    <div className="mt-2 grid grid-cols-2 gap-1 border border-brand-ink/10 bg-brand-muted/40 p-1 sm:grid-cols-4">
                      {(
                        [
                          ["upload", "Upload", UploadIcon],
                          ["youtube", "YouTube", Link2],
                          ["vimeo", "Vimeo", Link2],
                          ["url", "Link", Link2],
                        ] as const
                      ).map(([value, label, Icon]) => {
                        const active = videoSource === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setVideoSource(value);
                              if (activeLesson && activeLesson.video_source !== value) {
                                void updateLesson(activeLesson.id, { video_source: value, lesson_type: "video" });
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold transition ${
                              active ? "bg-brand-surface text-brand-ink shadow-sm" : "text-brand-ink/55 hover:text-brand-ink"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {videoSource === "upload" ? (
                    <Upload
                      folder="lessons"
                      subfolder={`${course.id}/${activeLesson.id}`}
                      uploadUrl={`/api/studio/lessons/${activeLesson.id}/video`}
                      accept="video/mp4,video/webm,video/quicktime"
                      label="Drop or click to upload video"
                      hint={
                        activeLesson.video_url && activeLesson.video_source === "upload"
                          ? "Video on file. Upload again to replace."
                          : "MP4, WebM, or MOV · up to 512 MB"
                      }
                      onSuccess={async () => {
                        await loadCourse(slug);
                        showToast("Video uploaded");
                      }}
                      onError={(msg) => setError(msg)}
                    />
                  ) : (
                    <label className="block">
                      <span className={studioLabelClass}>
                        {videoSource === "youtube"
                          ? "YouTube URL"
                          : videoSource === "vimeo"
                            ? "Vimeo URL"
                            : "Direct video URL"}
                      </span>
                      <input
                        value={videoLink}
                        onChange={(e) => setVideoLink(e.target.value)}
                        placeholder={
                          videoSource === "youtube"
                            ? "https://www.youtube.com/watch?v=…"
                            : videoSource === "vimeo"
                              ? "https://vimeo.com/…"
                              : "https://…/lesson.mp4"
                        }
                        className={studioFieldClass}
                      />
                    </label>
                  )}

                  {videoSource !== "upload" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveVideoLink()}
                      className="w-full border border-brand-ink bg-brand-ink py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink/90 disabled:opacity-50"
                    >
                      Save video link
                    </button>
                  ) : null}

                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-brand-ink">
                    <input
                      type="checkbox"
                      checked={isPreviewable}
                      onChange={(e) => setIsPreviewable(e.target.checked)}
                      className="h-4 w-4 border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
                    />
                    Free preview before enrollment
                  </label>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveLessonDetails()}
                    className="w-full border border-brand-ink/15 bg-brand-surface py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted/60 disabled:opacity-50"
                  >
                    Save lesson details
                  </button>

                  <div>
                    <p className={`${studioLabelClass} mb-2`}>Preview</p>
                    <ProtectedVideoPlayer
                      src={previewStream ?? previewDirect}
                      embedUrl={previewEmbed}
                      title={activeLesson.title}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-4 text-center">
              <p className="font-display text-lg font-semibold text-brand-ink">Nothing selected</p>
              <p className="mt-2 max-w-xs text-sm text-brand-ink/55">
                Create a lesson or assessment in the outline, then edit it here.
              </p>
            </div>
          )}
        </StudioPanel>
      </div>

      <div className="flex justify-end border-t border-brand-ink/10 pt-6">
        <button type="button" onClick={onContinueToReview} className="btn-cta-accent inline-flex items-center gap-2">
          Continue to review
        </button>
      </div>
    </div>
  );
}
