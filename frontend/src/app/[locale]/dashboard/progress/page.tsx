"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { formInputClass, formLabelClass } from "@/lib/form-styles";

type MyCourseItem = {
  slug: string;
  title: string;
  lessons: number;
  lesson_done: number;
  progress_pct: number;
  status?: string;
  instructor_name?: string | null;
  instructor_email?: string | null;
};

export default function DashboardProgressPage() {
  const [items, setItems] = useState<MyCourseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof data?.detail === "string" ? data.detail : "We couldn't load your progress.");
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
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Loading progress…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">Progress</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Update how many lessons you have finished and your overall percentage. Values are saved to your enrollment so
          the dashboard and certificates stay accurate.
        </p>
      </header>
      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            You are not enrolled in any courses yet.{" "}
            <Link href="/courses" className="font-bold text-brand-primary hover:underline">
              Browse the catalog
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => (
            <li key={c.slug} className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-brand-ink">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.slug}</p>
                </div>
                {c.status ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-700">
                    {c.status}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className={`${formLabelClass} text-xs`}>
                  Lessons completed
                  <input
                    type="number"
                    min={0}
                    max={c.lessons}
                    defaultValue={c.lesson_done}
                    id={`ld-${c.slug}`}
                    className={formInputClass}
                  />
                </label>
                <label className={`${formLabelClass} text-xs`}>
                  Progress (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={c.progress_pct}
                    id={`pct-${c.slug}`}
                    className={formInputClass}
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
                className="mt-4 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-50"
              >
                {saving === c.slug ? "Saving…" : "Save progress"}
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
