"use client";

import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { formInputClass, formLabelClass, formTextareaClass } from "@/lib/form-styles";

export function CreateCourseForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [lessonsCount, setLessonsCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/courses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl.trim(),
          lessons_count: lessonsCount,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        router.push(`/login?from=${encodeURIComponent("/dashboard/instructor/create-course")}`);
        return;
      }
      if (!res.ok) {
        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail.map((x: unknown) => JSON.stringify(x)).join("; ")
              : "We couldn't create the course. Try again.";
        setError(detail);
        return;
      }
      const s = (data as { slug?: string }).slug ?? slug.trim().toLowerCase();
      router.push(`/courses/${s}`);
      router.refresh();
    } catch {
      setError("Connection problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-slate-600">
        For the full experience, use Course Studio. This quick form still creates a draft course with a URL slug (lowercase letters, numbers, and hyphens only).
      </p>
      <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-sm">
        <label className={formLabelClass}>
          URL slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={formInputClass}
            autoComplete="off"
            placeholder="fullstack-react"
          />
        </label>
        <label className={formLabelClass}>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClass} />
        </label>
        <label className={formLabelClass}>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={formTextareaClass} />
        </label>
        <label className={formLabelClass}>
          Cover image URL
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className={formInputClass}
            placeholder="https://…"
          />
        </label>
        <label className={formLabelClass}>
          Lesson count (optional)
          <input
            type="number"
            min={0}
            value={lessonsCount}
            onChange={(e) => setLessonsCount(Number(e.target.value) || 0)}
            className={formInputClass}
          />
        </label>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="btn-primary-brand w-full !py-3 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save draft"}
        </button>
      </div>
    </div>
  );
}
