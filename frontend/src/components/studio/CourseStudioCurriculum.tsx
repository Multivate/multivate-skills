"use client";

import { GripVertical, Loader2, Plus, Trash2, Upload, Video, Link2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedVideoPlayer } from "@/components/player/ProtectedVideoPlayer";
import { formInputClass, formInputCompactClass, formLabelClass } from "@/lib/form-styles";

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

type CourseDetail = {
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

export function CourseStudioCurriculum({
  slug,
  course,
  busy,
  uploadPct,
  setBusy,
  setUploadPct,
  setError,
  loadCourse,
  showToast,
  onContinueToReview,
}: Props) {
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonSection, setNewLessonSection] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const dragLesson = useRef<string | null>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [videoSource, setVideoSource] = useState<VideoSource>("upload");
  const [videoLink, setVideoLink] = useState("");
  const [isPreviewable, setIsPreviewable] = useState(false);
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
    const rows: { key: string; title: string; lessons: Lesson[] }[] = sections.map((s) => ({
      key: s.id,
      title: s.title,
      lessons: course.lessons.filter((l) => l.section_id === s.id).sort((a, b) => a.position - b.position),
    }));
    const loose = course.lessons.filter((l) => !l.section_id).sort((a, b) => a.position - b.position);
    if (loose.length) rows.unshift({ key: "loose", title: "Getting started", lessons: loose });
    return rows;
  }, [course]);

  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/sections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSectionTitle.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't add that section.");
        return;
      }
      setNewSectionTitle("");
      await loadCourse(slug);
      showToast("Section added");
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async () => {
    if (!newLessonTitle.trim()) return;
    setBusy(true);
    try {
      const sectionId = newLessonSection && newLessonSection !== "loose" ? newLessonSection : null;
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/lessons`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          title: newLessonTitle.trim(),
          lesson_type: "video",
          video_source: "upload",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't add that lesson.");
        return;
      }
      setNewLessonTitle("");
      await loadCourse(slug);
      setSelectedLessonId((data as { id: string }).id);
      showToast("Lesson added — now add your video");
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
    if (!window.confirm("Remove this lesson? This cannot be undone.")) return;
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

  const uploadLessonVideo = async (lessonId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    setUploadPct(8);
    try {
      const res = await fetch(`/api/studio/lessons/${lessonId}/video`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      setUploadPct(100);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Video upload failed.");
        return;
      }
      await loadCourse(slug);
      showToast("Video uploaded");
    } finally {
      setBusy(false);
      window.setTimeout(() => setUploadPct(null), 800);
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
    const opts = course.sections.map((s) => ({ value: s.id, label: s.title }));
    return [{ value: "loose", label: "Getting started (no section)" }, ...opts];
  }, [course.sections]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 text-sm text-slate-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-slate-300">
        Build your course in sections. Each lesson needs a video — upload a file or paste a YouTube, Vimeo, or direct link. Students watch inside the app; videos are not downloadable.
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="font-bold text-brand-ink">Sections & lessons</h3>
            <p className="mt-1 text-xs text-slate-500">Drag lessons to reorder. Click a lesson to edit its video.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Section name, e.g. Introduction"
              className={`min-w-[200px] flex-1 ${formInputCompactClass}`}
            />
            <button
              type="button"
              disabled={busy || !newSectionTitle.trim()}
              onClick={() => void addSection()}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add section
            </button>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-accent">Add a lesson</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select
                value={newLessonSection}
                onChange={(e) => setNewLessonSection(e.target.value)}
                className={`sm:w-44 ${formInputCompactClass}`}
              >
                <option value="">Pick a section</option>
                {sectionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Lesson title"
                className={`flex-1 ${formInputCompactClass}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addLesson();
                }}
              />
              <button
                type="button"
                disabled={busy || !newLessonTitle.trim()}
                onClick={() => void addLesson()}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add lesson
              </button>
            </div>
          </div>

          {groupedLessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
              <Video className="mx-auto h-10 w-10 text-brand-accent" />
              <p className="mt-3 text-sm font-semibold text-brand-ink">No lessons yet</p>
              <p className="mt-1 text-sm text-slate-500">Add a section above, then create your first lesson.</p>
            </div>
          ) : (
            groupedLessons.map((group) => (
              <div key={group.key} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-brand-ink">{group.title}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setNewLessonSection(group.key);
                      document.getElementById("studio-new-lesson-title")?.focus();
                    }}
                    className="text-xs font-bold text-brand-primary hover:underline"
                  >
                    + Lesson here
                  </button>
                </div>
                <ul className="mt-3 space-y-2">
                  {group.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      draggable
                      onDragStart={() => {
                        dragLesson.current = lesson.id;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!dragLesson.current) return;
                        const ids = [...course.lessons].sort((a, b) => a.position - b.position).map((l) => l.id);
                        const from = ids.indexOf(dragLesson.current);
                        const to = ids.indexOf(lesson.id);
                        if (from < 0 || to < 0) return;
                        ids.splice(from, 1);
                        ids.splice(to, 0, dragLesson.current);
                        void reorderLessons(ids);
                      }}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                        (selectedLessonId ?? activeLesson?.id) === lesson.id
                          ? "border-brand-primary bg-violet-50 ring-1 ring-brand-primary/20 dark:bg-violet-950/30"
                          : "border-slate-200 bg-white hover:border-brand-accent/40 dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                      <Video className="h-4 w-4 shrink-0 text-brand-accent" />
                      <span className="flex-1 font-medium">{lesson.title}</span>
                      {lesson.video_url ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Video</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">Needs video</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {activeLesson ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-brand-ink">Lesson video</h3>
                <button
                  type="button"
                  onClick={() => void deleteLesson(activeLesson.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>

              <label className={formLabelClass}>
                Lesson title
                <input id="studio-new-lesson-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={formInputClass} />
              </label>

              <label className={formLabelClass}>
                Notes for students (optional)
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={2} className={formInputClass} />
              </label>

              <div>
                <p className="text-sm font-semibold text-slate-800">How do you want to add video?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["upload", "Upload file", Upload],
                      ["youtube", "YouTube", Link2],
                      ["vimeo", "Vimeo", Link2],
                      ["url", "Video link", Link2],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setVideoSource(value);
                        if (activeLesson && activeLesson.video_source !== value) {
                          void updateLesson(activeLesson.id, { video_source: value, lesson_type: "video" });
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        videoSource === value
                          ? "bg-brand-primary text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-brand-primary dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {videoSource === "upload" ? (
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-brand-accent/50 hover:bg-violet-50/30 dark:border-slate-700 dark:bg-slate-900/50"
                  onClick={() => videoFileRef.current?.click()}
                >
                  <Upload className="mx-auto h-8 w-8 text-brand-accent" />
                  <p className="mt-2 text-sm font-semibold text-brand-ink">Click to upload video</p>
                  <p className="mt-1 text-xs text-slate-500">MP4, WebM, or MOV — up to 512 MB</p>
                  {activeLesson.video_url && activeLesson.video_source === "upload" ? (
                    <p className="mt-2 text-xs font-medium text-emerald-700">Video uploaded — upload again to replace</p>
                  ) : null}
                  <input
                    ref={videoFileRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLessonVideo(activeLesson.id, f);
                    }}
                  />
                </div>
              ) : (
                <label className={formLabelClass}>
                  {videoSource === "youtube" ? "YouTube link" : videoSource === "vimeo" ? "Vimeo link" : "Direct video link (MP4/WebM)"}
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
                    className={formInputClass}
                  />
                </label>
              )}

              {uploadPct !== null ? (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-accent transition-all" style={{ width: `${uploadPct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Uploading… {uploadPct}%</p>
                </div>
              ) : null}

              {videoSource !== "upload" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveVideoLink()}
                  className="w-full rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  Save video link
                </button>
              ) : null}

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isPreviewable}
                  onChange={(e) => setIsPreviewable(e.target.checked)}
                  className="rounded border-slate-300 text-brand-accent"
                />
                Allow free preview before enroll
              </label>

              <button
                type="button"
                disabled={busy}
                onClick={() => void saveLessonDetails()}
                className="w-full rounded-xl border border-brand-primary/30 bg-violet-50 py-2.5 text-sm font-semibold text-brand-primary transition hover:bg-violet-100 disabled:opacity-50"
              >
                Save lesson details
              </button>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-accent">Preview</p>
                <ProtectedVideoPlayer
                  src={previewStream ?? previewDirect}
                  embedUrl={previewEmbed}
                  title={activeLesson.title}
                />
              </div>
            </>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
              <Video className="h-12 w-12 text-brand-accent" />
              <p className="mt-4 text-sm font-semibold text-brand-ink">Select or create a lesson</p>
              <p className="mt-2 text-sm text-slate-500">Add a lesson on the left, then upload a video or paste a link here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinueToReview}
          className="rounded-xl border border-brand-primary/30 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-brand-primary transition hover:bg-violet-100"
        >
          Continue to review
        </button>
      </div>
    </div>
  );
}
