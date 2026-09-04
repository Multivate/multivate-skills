"use client";

import { GripVertical, Loader2, Plus, Trash2, Upload as UploadIcon, Video, Link2 } from "lucide-react";
import { Upload } from "@/components/ui/Upload";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedVideoPlayer } from "@/components/player/ProtectedVideoPlayer";
import {
  StudioPanel,
  studioFieldClass,
  studioLabelClass,
} from "@/components/studio/studio-ui";

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
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonSection, setNewLessonSection] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const dragLesson = useRef<string | null>(null);

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
    if (loose.length) rows.unshift({ key: "loose", title: "Unsectioned", lessons: loose });
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
      showToast("Lesson added");
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
    return [{ value: "loose", label: "Unsectioned" }, ...opts];
  }, [course.sections]);

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm leading-relaxed text-brand-ink/65">
        Organize the course into sections, then add lessons. Each lesson needs a video - upload a file or paste a
        YouTube, Vimeo, or direct link. Learners watch inside Multivate; downloads are disabled.
      </p>

      <div className="grid gap-6 xl:grid-cols-12">
        <StudioPanel
          title="Outline"
          description="Drag to reorder. Select a lesson to edit."
          className="xl:col-span-7"
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="New section title"
                className={`min-w-0 flex-1 ${studioFieldClass} !mt-0`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addSection();
                }}
              />
              <button
                type="button"
                disabled={busy || !newSectionTitle.trim()}
                onClick={() => void addSection()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-brand-ink bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink/90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Section
              </button>
            </div>

            <div className="border border-brand-ink/10 bg-brand-muted/30 p-4">
              <p className={studioLabelClass}>Add lesson</p>
              <div className="mt-3 flex flex-col gap-2 lg:flex-row">
                <select
                  value={newLessonSection}
                  onChange={(e) => setNewLessonSection(e.target.value)}
                  className={`lg:w-48 ${studioFieldClass} !mt-0`}
                >
                  <option value="">Section…</option>
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
                  placeholder="Lesson title"
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
                  Lesson
                </button>
              </div>
            </div>

            {groupedLessons.length === 0 ? (
              <div className="border border-dashed border-brand-ink/15 px-6 py-14 text-center">
                <p className="font-display text-xl font-semibold text-brand-ink">Start the outline</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-brand-ink/55">
                  Add a section, then create your first lesson. You can reorder anytime.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedLessons.map((group) => (
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
                        <li className="py-4 text-sm text-brand-ink/45">No lessons in this section yet.</li>
                      ) : (
                        group.lessons.map((lesson) => {
                          const selected = (selectedLessonId ?? activeLesson?.id) === lesson.id;
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
                              <Video className="h-4 w-4 shrink-0 text-brand-ink/45" aria-hidden />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-ink">
                                {lesson.title}
                              </span>
                              <span
                                className={`shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                                  lesson.video_url ? "text-emerald-700" : "text-amber-800"
                                }`}
                              >
                                {lesson.video_url ? "Video" : "Needs video"}
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
          </div>
        </StudioPanel>

        <StudioPanel
          title={activeLesson ? "Lesson editor" : "Lesson editor"}
          description={activeLesson ? "Video, notes, and preview settings" : "Select a lesson from the outline"}
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
                <span className={studioLabelClass}>Learner notes</span>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className={`${studioFieldClass} min-h-[5rem] resize-y`}
                />
              </label>

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
                          active ? "bg-white text-brand-ink shadow-sm" : "text-brand-ink/55 hover:text-brand-ink"
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
                className="w-full border border-brand-ink/15 bg-white py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted/60 disabled:opacity-50"
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
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-4 text-center">
              <p className="font-display text-lg font-semibold text-brand-ink">No lesson selected</p>
              <p className="mt-2 max-w-xs text-sm text-brand-ink/55">
                Create a lesson in the outline, then return here to attach video and notes.
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
