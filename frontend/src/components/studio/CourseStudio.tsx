"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  ChevronRight,
  ImagePlus,
  Loader2,
  Play,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CourseStudioCurriculum } from "@/components/studio/CourseStudioCurriculum";
import { formInputClass, formLabelClass, formTextareaClass } from "@/lib/form-styles";
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
  const [promoVideoUrl, setPromoVideoUrl] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setPromoVideoUrl(c.promo_video_url ?? "");
    setThumbPreview(c.image_url || null);
    setError(null);
  }, []);

  useEffect(() => {
    if (initialSlug) void loadCourse(initialSlug);
  }, [initialSlug, loadCourse]);

  useEffect(() => {
    if (step === 2 && slug && !course && !busy) {
      void loadCourse(slug);
    }
  }, [step, slug, course, busy, loadCourse]);

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
      promo_video_url: promoVideoUrl.trim() || null,
      slug: customSlug.trim() || undefined,
    }),
    [title, subtitle, description, objectives, category, level, language, tags, priceCents, isFree, promoVideoUrl, customSlug],
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
            <label className={formLabelClass}>
              Promo video link (optional)
              <input
                value={promoVideoUrl}
                onChange={(e) => setPromoVideoUrl(e.target.value)}
                placeholder="YouTube or Vimeo link for the course page"
                className={formInputClass}
              />
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

      {step === 2 && slug && course ? (
        <CourseStudioCurriculum
          slug={slug}
          course={course}
          busy={busy}
          uploadPct={uploadPct}
          setBusy={setBusy}
          setUploadPct={setUploadPct}
          setError={setError}
          loadCourse={loadCourse}
          showToast={showToast}
          onContinueToReview={() => setStep(3)}
        />
      ) : null}

      {step === 2 && slug && !course ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <p className="animate-pulse text-sm text-slate-500">Loading curriculum…</p>
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
                <li>
                  {course.lessons.filter((l) => l.video_url).length} of {course.lessons.length} lessons have video
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" disabled={busy || course.status === "pending_review"} onClick={() => void submitReview()} className="btn-primary-brand !min-w-0 inline-flex items-center gap-2 disabled:opacity-60">
                  <Send className="h-4 w-4" />
                  {course.status === "pending_review" ? "In review" : "Submit for review"}
                </button>
                {course.status === "published" ? (
                  <Link href={`/learn/${course.slug}`} className="btn-outline-brand !min-w-0">
                    Open course
                  </Link>
                ) : (
                  <Link href={`/learn/${course.slug}?preview=1`} className="btn-outline-brand !min-w-0">
                    Preview lessons
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
