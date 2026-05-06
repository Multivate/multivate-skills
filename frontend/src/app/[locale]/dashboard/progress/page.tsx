"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type MyCourseItem = {
  slug: string;
  title: string;
  lessons: number;
  lesson_done: number;
  progress_pct: number;
};

export default function DashboardProgressPage() {
  const [items, setItems] = useState<MyCourseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof data?.detail === "string" ? data.detail : "Could not load.");
      setItems([]);
      return;
    }
    setError(null);
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (slug: string, lesson_done: number, progress_pct: number) => {
    setSaving(slug);
    try {
      const res = await fetch(`/api/learning/progress/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_done, progress_pct }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.detail === "string" ? data.detail : "Save failed.");
        return;
      }
      await load();
    } finally {
      setSaving(null);
    }
  };

  if (items === null) {
    return <p className="text-sm text-slate-600">Loading progress…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-extrabold text-brand-ink sm:text-xl">Progress</h1>
        <p className="mt-1 text-sm text-slate-600">Updates your enrollment row via the Multivate learning API.</p>
      </div>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">
          No enrollments. <Link href="/courses" className="font-semibold text-brand-primary hover:underline">Browse courses</Link>.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => (
            <li key={`${c.slug}-${c.lesson_done}-${c.progress_pct}`} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="font-bold text-brand-ink">{c.title}</p>
              <p className="text-xs text-slate-500">{c.slug}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Lessons completed
                  <input
                    type="number"
                    min={0}
                    max={c.lessons}
                    defaultValue={c.lesson_done}
                    id={`ld-${c.slug}`}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Progress %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={c.progress_pct}
                    id={`pct-${c.slug}`}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={saving === c.slug}
                onClick={() => {
                  const ld = Number((document.getElementById(`ld-${c.slug}`) as HTMLInputElement)?.value);
                  const pct = Number((document.getElementById(`pct-${c.slug}`) as HTMLInputElement)?.value);
                  void save(c.slug, ld, pct);
                }}
                className="mt-3 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving === c.slug ? "Saving…" : "Save"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link href="/dashboard" className="inline-block text-sm font-semibold text-brand-primary hover:underline">
        ← Dashboard
      </Link>
    </div>
  );
}
