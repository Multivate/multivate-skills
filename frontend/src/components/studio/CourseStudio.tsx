"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  ChevronRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formInputClass, formInputCompactClass, formLabelClass, formTextareaClass } from "@/lib/form-styles";
import { resolveCourseImageUrl } from "@/lib/course-image";

const CATEGORIES = [
  "Artificial Intelligence",
  "Design Thinking",
  "Cloud Computing",
  "German Language",
  "Data Science",
  "general",
];

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
];

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
  title: string;
  subtitle: string | null;
  description: string;
  learning_objectives: string | null;
  image_url: string;
  category: string;
  level: string;
  language: string;
  duration_minutes: number;
  tags: string | null;
  price_cents: number;
  currency: string;
  is_free: boolean;
  promo_video_url: string | null;
  status: string;
  rejection_reason: string | null;
  sections: Section[];
  lessons: Lesson[];
};

type Props = { initialSlug?: string };

const STEPS = ["Basics", "Cover", "Curriculum", "Review"];

function statusLabel(status: string) {
  if (status === "published") return "Live";
  if (status === "pending_review") return "In review";
  if (status === "archived") return "Archived";
  return "Draft";
}

function statusClass(status: string) {
  if (status === "published") return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (status === "pending_review") return "bg-amber-100 text-amber-950 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function CourseStudio({ initialSlug }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [category, setCategory] = useState("general");
  const [level, setLevel] = useState("beginner");
  const [language, setLanguage] = useState("en");
  const [tags, setTags] = useState("");
  const [priceCents, setPriceCents] = useState(990000);
  const [isFree, setIsFree] = useState(false);
  const [customSlug, setCustomSlug] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const dragLesson = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadCourse = useCallback(async (s: string) => {
    const res = await fetch(`/api/studio/courses/${encodeURIComponent(s)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof data?.detail === "string" ? data.detail : "We couldn't load this course.");
      return;
    }
    const c = data as CourseDetail;
    setCourse(c);
    setSlug(c.slug);
    setTitle(c.title);
    setSubtitle(c.subtitle ?? "");
    setDescription(c.description);
    setObjectives(c.learning_objectives ?? "");
    setCategory(c.category);
    setLevel(c.level);
    setLanguage(c.language);
    setTags(c.tags ?? "");
    setPriceCents(c.price_cents);
    setIsFree(c.is_free);
    setThumbPreview(c.image_url || null);
    setError(null);
  }, []);

  useEffect(() => {
    if (initialSlug) void loadCourse(initialSlug);
  }, [initialSlug, loadCourse]);

  const basicsPayload = useMemo(
    () => ({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      description: description.trim(),
      learning_objectives: objectives.trim() || null,
      category,
      level,
      language,
      duration_minutes: course?.duration_minutes ?? 0,
      tags: tags.trim() || null,
      price_cents: isFree ? 0 : priceCents,
      currency: "NGN",
      is_free: isFree,
      promo_video_url: course?.promo_video_url ?? null,
      slug: customSlug.trim() || undefined,
    }),
    [title, subtitle, description, objectives, category, level, language, tags, priceCents, isFree, course, customSlug],
  );

  const saveBasics = async () => {
    setBusy(true);
    setError(null);
    try {
      const isNew = !slug;
      const res = await fetch(isNew ? "/api/studio/courses" : `/api/studio/courses/${encodeURIComponent(slug)}`, {
        method: isNew ? "POST" : "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basicsPayload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't save your changes.");
        return;
      }
      const saved = data as { slug: string };
      if (isNew) {
        setSlug(saved.slug);
        router.replace(`/dashboard/instructor/studio/${saved.slug}`);
      }
      await loadCourse(saved.slug);
      showToast("Saved");
      setStep(1);
    } finally {
      setBusy(false);
    }
  };

  const uploadThumbnail = async (file: File) => {
    if (!slug) return;
    setUploadPct(0);
    const preview = URL.createObjectURL(file);
    setThumbPreview(preview);
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/thumbnail`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "Upload failed.");
        return;
      }
      setUploadPct(100);
      await loadCourse(slug);
      showToast("Cover updated");
    } finally {
      setBusy(false);
      window.setTimeout(() => setUploadPct(null), 800);
    }
  };

  const addSection = async () => {
    if (!slug || !newSectionTitle.trim()) return;
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

  const addLesson = async (sectionId: string | null) => {
    if (!slug) return;
    const lessonTitle = window.prompt("Lesson title");
    if (!lessonTitle?.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/lessons`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: sectionId,
          title: lessonTitle.trim(),
          lesson_type: "video",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't add that lesson.");
        return;
      }
      await loadCourse(slug);
      setSelectedLesson((data as { id: string }).id);
      showToast("Lesson added");
    } finally {
      setBusy(false);
    }
  };

  const updateLesson = async (lessonId: string, patch: Record<string, unknown>) => {
    if (!slug) return;
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
        return;
      }
      await loadCourse(slug);
      showToast("Lesson updated");
    } finally {
      setBusy(false);
    }
  };

  const uploadLessonVideo = async (lessonId: string, file: File) => {
    if (!slug) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    setUploadPct(10);
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

  const reorderLessons = async (ordered: string[]) => {
    if (!slug) return;
    await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/lessons/reorder`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_ids: ordered }),
    });
    await loadCourse(slug);
  };

  const submitReview = async () => {
    if (!slug) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/submit`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't submit for review. Check that you have a cover image and at least one lesson.");
        return;
      }
      await loadCourse(slug);
      showToast("Sent for review");
    } finally {
      setBusy(false);
    }
  };

  const activeLesson = course?.lessons.find((l) => l.id === selectedLesson) ?? course?.lessons[0] ?? null;

  const groupedLessons = useMemo(() => {
    if (!course) return [];
    const sections = [...course.sections].sort((a, b) => a.position - b.position);
    const rows: { key: string; title: string; lessons: Lesson[] }[] = sections.map((s) => ({
      key: s.id,
      title: s.title,
      lessons: course.lessons.filter((l) => l.section_id === s.id).sort((a, b) => a.position - b.position),
    }));
    const loose = course.lessons.filter((l) => !l.section_id).sort((a, b) => a.position - b.position);
    if (loose.length) rows.unshift({ key: "loose", title: "General", lessons: loose });
    return rows;
  }, [course]);

  const thumbDisplay = useMemo(() => {
    if (!thumbPreview) return null;
    if (thumbPreview.startsWith("blob:")) return thumbPreview;
    return resolveCourseImageUrl(thumbPreview) ?? thumbPreview;
  }, [thumbPreview]);

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 rounded-xl bg-brand-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Course studio</p>
          <h2 className="mt-1 text-2xl font-extrabold text-brand-ink">
            {slug ? title || "Untitled course" : "Create a new course"}
          </h2>
          {course ? (
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${statusClass(course.status)}`}>
              {statusLabel(course.status)}
            </span>
          ) : null}
        </div>
        {slug ? (
          <Link
            href={`/learn/${slug}?preview=1`}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/30 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-brand-primary transition hover:bg-violet-100"
          >
            <Play className="h-4 w-4" />
            Preview
          </Link>
        ) : null}
      </div>

      {course?.rejection_reason ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {course.rejection_reason}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              step === i
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">{i + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}

      {step === 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className={formLabelClass}>
              Course title *
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClass} />
            </label>
            <label className={formLabelClass}>
              Subtitle
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={formInputClass} />
            </label>
            {!slug ? (
              <label className={formLabelClass}>
                URL slug (optional)
                <input value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} placeholder="my-course-name" className={formInputClass} />
              </label>
            ) : null}
            <label className={formLabelClass}>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={formTextareaClass} />
            </label>
            <label className={formLabelClass}>
              What students will learn
              <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={3} placeholder="One objective per line" className={formTextareaClass} />
            </label>
          </div>
          <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label className={formLabelClass}>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={formInputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "general" ? "General" : c}
                  </option>
                ))}
              </select>
            </label>
            <label className={formLabelClass}>
              Level
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={formInputClass}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={formLabelClass}>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={formInputClass}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={formLabelClass}>
              Tags
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, web, career" className={formInputClass} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="rounded border-slate-300 text-brand-accent" />
              Free course
            </label>
            {!isFree ? (
              <label className={formLabelClass}>
                Price (kobo / cents)
                <input type="number" min={0} value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value) || 0)} className={formInputClass} />
              </label>
            ) : null}
            <button type="button" disabled={busy || !title.trim()} onClick={() => void saveBasics()} className="btn-primary-brand w-full disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save & continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600">Upload a clear cover image. JPG, PNG, or WEBP, up to 6 MB.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div
              className="group relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-brand-accent/60 hover:bg-violet-50/40"
              onClick={() => fileRef.current?.click()}
            >
              {thumbDisplay ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbDisplay} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
              ) : (
                <>
                  <ImagePlus className="h-10 w-10 text-brand-accent" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">Drop or click to upload</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadThumbnail(f);
                }}
              />
            </div>
            <div className="flex flex-col justify-center space-y-4">
              {uploadPct !== null ? (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-accent transition-all" style={{ width: `${uploadPct}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-600">Uploading… {uploadPct}%</p>
                </div>
              ) : null}
              <button type="button" onClick={() => setStep(2)} className="btn-primary-brand w-full">
                Continue to curriculum
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 && course ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="New section title"
                className={`flex-1 ${formInputCompactClass}`}
              />
              <button type="button" onClick={() => void addSection()} className="inline-flex items-center gap-1 rounded-lg bg-brand-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                <Plus className="h-4 w-4" /> Section
              </button>
            </div>
            {groupedLessons.map((group) => (
              <div key={group.key} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-brand-ink">{group.title}</h3>
                  <button type="button" onClick={() => void addLesson(group.key === "loose" ? null : group.key)} className="text-xs font-bold text-brand-primary hover:underline">
                    + Lesson
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
                        if (!dragLesson.current || !course) return;
                        const ids = course.lessons.sort((a, b) => a.position - b.position).map((l) => l.id);
                        const from = ids.indexOf(dragLesson.current);
                        const to = ids.indexOf(lesson.id);
                        if (from < 0 || to < 0) return;
                        ids.splice(from, 1);
                        ids.splice(to, 0, dragLesson.current);
                        void reorderLessons(ids);
                      }}
                      onClick={() => setSelectedLesson(lesson.id)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        selectedLesson === lesson.id
                          ? "border-brand-primary bg-violet-50 dark:bg-violet-950/30"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                      <Video className="h-4 w-4 shrink-0 text-brand-accent" />
                      <span className="flex-1 font-medium">{lesson.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {activeLesson ? (
            <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold text-brand-ink">Edit lesson</h3>
              <label className="block text-sm font-semibold">
                Title
                <input
                  defaultValue={activeLesson.title}
                  onBlur={(e) => void updateLesson(activeLesson.id, { title: e.target.value })}
                  className={formInputClass}
                />
              </label>
              <label className="block text-sm font-semibold">
                Video source
                <select
                  defaultValue={activeLesson.video_source ?? "youtube"}
                  onChange={(e) => void updateLesson(activeLesson.id, { video_source: e.target.value, lesson_type: "video" })}
                  className={formInputClass}
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="url">Custom link</option>
                  <option value="upload">Upload file</option>
                </select>
              </label>
              {activeLesson.video_source !== "upload" ? (
                <label className="block text-sm font-semibold">
                  Video URL
                  <input
                    defaultValue={activeLesson.video_url ?? ""}
                    onBlur={(e) => void updateLesson(activeLesson.id, { video_url: e.target.value })}
                    className={formInputClass}
                  />
                </label>
              ) : (
                <label className="block text-sm font-semibold">
                  Upload video
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="mt-1 w-full text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLessonVideo(activeLesson.id, f);
                    }}
                  />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={activeLesson.is_previewable}
                  onChange={(e) => void updateLesson(activeLesson.id, { is_previewable: e.target.checked })}
                />
                Free preview lesson
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 3 && course ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 text-brand-accent" />
            <div>
              <h3 className="text-lg font-bold text-brand-ink">Ready to publish?</h3>
              <p className="mt-1 text-sm text-slate-600">
                We review every course before it goes live. You can keep editing while it is in review.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>{course.lessons.length} lessons</li>
                <li>{course.sections.length} sections</li>
                <li>{course.image_url ? "Cover image added" : "Cover image missing"}</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" disabled={busy || course.status === "pending_review"} onClick={() => void submitReview()} className="btn-primary-brand !min-w-0 inline-flex items-center gap-2 disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {course.status === "pending_review" ? "In review" : "Submit for review"}
                </button>
                {course.status === "published" ? (
                  <Link href={`/courses/${course.slug}`} className="btn-outline-brand !min-w-0">
                    View live page
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
