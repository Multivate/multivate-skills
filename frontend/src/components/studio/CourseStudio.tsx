"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { ArrowLeft, ChevronRight, Loader2, Play, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CourseStudioCurriculum } from "@/components/studio/CourseStudioCurriculum";
import { CourseStudioAudioCurriculum } from "@/components/studio/CourseStudioAudioCurriculum";
import {
  StudioPanel,
  StudioQuietLink,
  StudioStatusPill,
  StudioStepNav,
  studioFieldClass,
  studioLabelClass,
  studioSelectClass,
  studioTextareaClass,
} from "@/components/studio/studio-ui";
import { resolveCourseImageUrl } from "@/lib/course-image";
import { formatMoney } from "@/lib/format-money";
import { Upload } from "@/components/ui/Upload";

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
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  learning_objectives: string | null;
  image_url: string;
  category: string;
  format?: string;
  source_language?: string;
  target_language?: string;
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
  phrases?: {
    id: string;
    section_id: string | null;
    position: number;
    source_text: string;
    target_text: string;
    audio_source: string | null;
    audio_url: string | null;
    audio_duration_seconds: number;
  }[];
};

type Props = { initialSlug?: string };

const STEPS = ["Basics", "Cover", "Content", "Review"];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={studioLabelClass}>{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-brand-ink/50">{hint}</span> : null}
    </label>
  );
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
  const [courseFormat, setCourseFormat] = useState<"video" | "audio">("video");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("de");
  const [level, setLevel] = useState("beginner");
  const [language, setLanguage] = useState("en");
  const [tags, setTags] = useState("");
  const [priceCents, setPriceCents] = useState(990000);
  const [isFree, setIsFree] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [promoVideoUrl, setPromoVideoUrl] = useState("");
  const [coverUrlInput, setCoverUrlInput] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

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
    setCourseFormat(c.format === "audio" ? "audio" : "video");
    setSourceLanguage(c.source_language || "en");
    setTargetLanguage(c.target_language || "de");
    setLevel(c.level);
    setLanguage(c.language);
    setTags(c.tags ?? "");
    setPriceCents(c.price_cents);
    setIsFree(c.is_free);
    setPromoVideoUrl(c.promo_video_url ?? "");
    setCoverUrlInput(c.image_url?.startsWith("http") ? c.image_url : "");
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
      format: courseFormat,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      level,
      language: courseFormat === "audio" ? targetLanguage : language,
      duration_minutes: course?.duration_minutes ?? 0,
      tags: tags.trim() || null,
      price_cents: isFree ? 0 : priceCents,
      currency: "NGN",
      is_free: isFree,
      promo_video_url: promoVideoUrl.trim() || null,
      slug: customSlug.trim() || undefined,
    }),
    [title, subtitle, description, objectives, category, courseFormat, sourceLanguage, targetLanguage, level, language, tags, priceCents, isFree, promoVideoUrl, customSlug, course?.duration_minutes],
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

  const saveCoverUrl = async () => {
    if (!slug || !coverUrlInput.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/cover-url`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: coverUrlInput.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't use that image link.");
        return;
      }
      await loadCourse(slug);
      showToast("Cover updated");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!slug) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}/submit`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof data?.detail === "string"
            ? data.detail
            : "We couldn't submit for review. Add a cover image and at least one lesson first.",
        );
        return;
      }
      await loadCourse(slug);
      showToast("Sent for review");
    } finally {
      setBusy(false);
    }
  };

  const deleteCourse = async () => {
    if (!slug || !course) return;
    const statusLabel =
      course.status === "published" ? "live" : course.status === "pending_review" ? "in review" : "draft";
    const ok = window.confirm(
      `Delete "${course.title}" permanently?\n\nThis ${statusLabel} course and its content will be removed. This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't delete that course.");
        return;
      }
      router.push("/dashboard/instructor/studio");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const thumbDisplay = useMemo(() => {
    if (!thumbPreview) return null;
    if (thumbPreview.startsWith("blob:")) return thumbPreview;
    return resolveCourseImageUrl(thumbPreview) ?? thumbPreview;
  }, [thumbPreview]);

  const priceNaira = Math.round(priceCents / 100);
  const lessonsWithVideo = course?.lessons.filter((l) => l.video_url).length ?? 0;
  const phrasesWithAudio = course?.phrases?.filter((p) => p.audio_url).length ?? 0;
  const isAudioCourse = course?.format === "audio" || courseFormat === "audio";
  const checklist = course
    ? isAudioCourse
      ? [
          { ok: Boolean(course.title?.trim()), label: "Title set" },
          { ok: Boolean(course.image_url), label: "Cover image" },
          {
            ok: (course.phrases?.length ?? 0) > 0,
            label: `${course.phrases?.length ?? 0} phrase${(course.phrases?.length ?? 0) === 1 ? "" : "s"}`,
          },
          {
            ok: phrasesWithAudio > 0,
            label: `${phrasesWithAudio} of ${course.phrases?.length ?? 0} with audio`,
          },
        ]
      : [
          { ok: Boolean(course.title?.trim()), label: "Title set" },
          { ok: Boolean(course.image_url), label: "Cover image" },
          { ok: course.lessons.length > 0, label: `${course.lessons.length} lesson${course.lessons.length === 1 ? "" : "s"}` },
          {
            ok: lessonsWithVideo > 0,
            label: `${lessonsWithVideo} of ${course.lessons.length} with video`,
          },
          { ok: course.sections.length > 0, label: `${course.sections.length} section${course.sections.length === 1 ? "" : "s"}` },
        ]
    : [];

  return (
    <div className="mx-auto max-w-[90rem] space-y-8">
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 border border-brand-ink bg-brand-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <StudioQuietLink href="/dashboard/instructor/studio">
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              All courses
            </span>
          </StudioQuietLink>
          <p className="tag-overline mt-5">Course studio</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
            {slug ? title || "Untitled course" : "New course"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {course ? <StudioStatusPill status={course.status} /> : null}
            {slug ? (
              <span className="text-sm text-brand-ink/50">
                /courses/<span className="text-brand-ink/70">{slug}</span>
              </span>
            ) : (
              <span className="text-sm text-brand-ink/55">Define the course, then build the curriculum.</span>
            )}
          </div>
        </div>
        {slug ? (
          <Link
            href={`/learn/${slug}?preview=1`}
            className="inline-flex items-center gap-2 border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-ink/30 hover:bg-brand-muted/50"
          >
            <Play className="h-4 w-4" aria-hidden />
            Preview
          </Link>
        ) : null}
      </div>

      {course?.rejection_reason ? (
        <div className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-950">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-amber-800">Revision needed</p>
          <p className="mt-2">{course.rejection_reason}</p>
        </div>
      ) : null}

      <StudioStepNav steps={STEPS} current={step} onChange={setStep} />

      {error ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      ) : null}

      {step === 0 ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <StudioPanel
            title="Course identity"
            description="How the course appears on Multivate"
            className="xl:col-span-7"
          >
            <div className="space-y-5">
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={studioFieldClass} required />
              </Field>
              <Field label="Subtitle" hint="One line under the title on the course page">
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={studioFieldClass} />
              </Field>
              {!slug ? (
                <Field label="URL slug" hint="Optional. Leave blank to generate from the title.">
                  <input
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="german-for-engineers"
                    className={studioFieldClass}
                  />
                </Field>
              ) : null}
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className={studioTextareaClass}
                />
              </Field>
              <Field label="Learning outcomes" hint="One outcome per line">
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  rows={4}
                  placeholder={"Speak confidently in workplace German\nPrepare for technical interviews"}
                  className={studioTextareaClass}
                />
              </Field>
              <Field label="Promo video" hint="Optional YouTube or Vimeo link for the public course page">
                <input
                  value={promoVideoUrl}
                  onChange={(e) => setPromoVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className={studioFieldClass}
                />
              </Field>
            </div>
          </StudioPanel>

          <StudioPanel title="Catalog & pricing" description="Discovery and checkout settings" className="xl:col-span-5">
            <div className="space-y-5">
              <div>
                <p className={studioLabelClass}>Course format</p>
                <div className="mt-2 grid grid-cols-2 gap-1 border border-brand-ink/10 bg-brand-muted/40 p-1">
                  {(
                    [
                      ["video", "Video course"],
                      ["audio", "Audio phrasebook"],
                    ] as const
                  ).map(([value, label]) => {
                    const locked = Boolean(slug) && (course?.lessons?.length || course?.phrases?.length);
                    const active = courseFormat === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={Boolean(locked) && !active}
                        onClick={() => setCourseFormat(value)}
                        className={`px-3 py-2.5 text-sm font-semibold transition ${
                          active ? "bg-white text-brand-ink shadow-sm" : "text-brand-ink/55 hover:text-brand-ink"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-brand-ink/50">
                  {courseFormat === "audio"
                    ? "Phrase pairs with playable audio, like a language phrasebook."
                    : "Sections and video lessons for a standard course."}
                </p>
              </div>
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={studioSelectClass}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c === "general" ? "General" : c}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Level">
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className={studioSelectClass}>
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {courseFormat === "video" ? (
                  <Field label="Language">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className={studioSelectClass}>
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field label="Target language">
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className={studioSelectClass}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
              {courseFormat === "audio" ? (
                <Field label="Source language">
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className={studioSelectClass}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Tags" hint="Comma-separated keywords">
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="german, career, visa"
                  className={studioFieldClass}
                />
              </Field>

              <div className="border border-brand-ink/10 bg-brand-muted/40 px-4 py-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-brand-ink">
                  <input
                    type="checkbox"
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    className="h-4 w-4 border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
                  />
                  Free course
                </label>
                {!isFree ? (
                  <div className="mt-4">
                    <Field label="Price (NGN)" hint={`Stored as ${priceCents.toLocaleString()} kobo · ${formatMoney(priceCents, "NGN")}`}>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={priceNaira}
                        onChange={(e) => setPriceCents(Math.max(0, Math.round(Number(e.target.value) || 0) * 100))}
                        className={studioFieldClass}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                disabled={busy || !title.trim()}
                onClick={() => void saveBasics()}
                className="btn-cta-accent inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Save & continue
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </StudioPanel>
        </div>
      ) : null}

      {step === 1 ? (
        <StudioPanel
          title="Cover image"
          description="Used on the catalog, course page, and studio list. Prefer a wide landscape image."
        >
          {!slug ? (
            <p className="text-sm text-brand-ink/60">Save the basics first so we can attach a cover to this course.</p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              <Upload
                folder="courses"
                subfolder={course?.id}
                uploadUrl={`/api/studio/courses/${encodeURIComponent(slug)}/thumbnail`}
                accept="image/jpeg,image/png,image/webp"
                label="Drop or click to upload cover"
                previewUrl={thumbDisplay}
                onSuccess={async () => {
                  await loadCourse(slug);
                  showToast("Cover updated");
                }}
                onError={(msg) => setError(msg)}
              />
              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  <Field label="Or paste an image URL">
                    <input
                      value={coverUrlInput}
                      onChange={(e) => setCoverUrlInput(e.target.value)}
                      placeholder="https://…"
                      className={studioFieldClass}
                    />
                  </Field>
                  <button
                    type="button"
                    disabled={busy || !coverUrlInput.trim()}
                    onClick={() => void saveCoverUrl()}
                    className="btn-outline-brand w-full disabled:opacity-60"
                  >
                    Save image link
                  </button>
                </div>
                <button type="button" onClick={() => setStep(2)} className="btn-cta-accent inline-flex w-full items-center justify-center gap-2">
                  Continue to curriculum
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          )}
        </StudioPanel>
      ) : null}

      {step === 2 && slug && course ? (
        course.format === "audio" || courseFormat === "audio" ? (
          <CourseStudioAudioCurriculum
            slug={slug}
            course={course}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            loadCourse={loadCourse}
            showToast={showToast}
            onContinueToReview={() => setStep(3)}
          />
        ) : (
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
        )
      ) : null}

      {step === 2 && slug && !course ? (
        <div className="flex min-h-[240px] items-center justify-center border border-brand-ink/10 bg-white">
          <p className="text-sm text-brand-ink/50">Loading curriculum…</p>
        </div>
      ) : null}

      {step === 3 && course ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <StudioPanel title="Publish checklist" description="Confirm the essentials before review" className="xl:col-span-7">
            <ul className="divide-y divide-brand-ink/10">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-brand-ink">{item.label}</span>
                  <span
                    className={`text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                      item.ok ? "text-emerald-700" : "text-amber-800"
                    }`}
                  >
                    {item.ok ? "Ready" : "Needed"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-brand-ink/60">
              Multivate reviews every course before it goes live. You can keep editing while it is in review.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || course.status === "pending_review"}
                onClick={() => void submitReview()}
                className="btn-cta-accent inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden />
                {course.status === "pending_review" ? "Already in review" : "Submit for review"}
              </button>
              <Link
                href={course.status === "published" ? `/learn/${course.slug}` : `/learn/${course.slug}?preview=1`}
                className="btn-outline-brand !min-w-0"
              >
                {course.status === "published" ? "Open live course" : "Preview as learner"}
              </Link>
            </div>
          </StudioPanel>

          <StudioPanel title="Summary" className="xl:col-span-5">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className={studioLabelClass}>Title</dt>
                <dd className="mt-1 font-semibold text-brand-ink">{course.title}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className={studioLabelClass}>Category</dt>
                  <dd className="mt-1 text-brand-ink">{course.category === "general" ? "General" : course.category}</dd>
                </div>
                <div>
                  <dt className={studioLabelClass}>Level</dt>
                  <dd className="mt-1 capitalize text-brand-ink">{course.level}</dd>
                </div>
              </div>
              <div>
                <dt className={studioLabelClass}>Price</dt>
                <dd className="mt-1 text-brand-ink">
                  {course.is_free ? "Free" : formatMoney(course.price_cents, course.currency || "NGN")}
                </dd>
              </div>
              <div>
                <dt className={studioLabelClass}>Status</dt>
                <dd className="mt-2">
                  <StudioStatusPill status={course.status} />
                </dd>
              </div>
            </dl>
            <div className="mt-8 border-t border-brand-ink/10 pt-6">
              <p className={studioLabelClass}>Danger zone</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-ink/60">
                Permanently remove this course whether it is draft, in review, or live.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteCourse()}
                className="mt-4 text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:opacity-50"
              >
                Delete course
              </button>
            </div>
          </StudioPanel>
        </div>
      ) : null}
    </div>
  );
}
