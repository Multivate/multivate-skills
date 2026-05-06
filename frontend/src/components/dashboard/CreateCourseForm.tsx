"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
              : "Could not create course.";
        setError(detail);
        return;
      }
      const s = (data as { slug?: string }).slug ?? slug.trim().toLowerCase();
      router.push(`/courses/${s}`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-slate-600">
        Creates a catalog row via <code className="rounded bg-slate-100 px-1">POST /api/v1/courses</code>. Slug must be
        lowercase letters, numbers, and single hyphens (e.g. <code className="rounded bg-slate-100 px-1">fullstack-react</code>).
      </p>
      <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800">
          Slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            autoComplete="off"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Image URL
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="https://…"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Initial lessons count (denormalized; syncs when you add lesson rows)
          <input
            type="number"
            min={0}
            value={lessonsCount}
            onChange={(e) => setLessonsCount(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="btn-primary-brand w-full !py-3 disabled:opacity-60"
        >
          {busy ? "Publishing…" : "Publish course"}
        </button>
      </div>
    </div>
  );
}
