"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type MyCourseItem = {
  slug: string;
  title: string;
  lessons: number;
  lesson_done: number;
  progress_pct: number;
  status?: string;
  instructor_name?: string | null;
};

export default function DashboardProgressPage() {
  const [items, setItems] = useState<MyCourseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't load your progress.");
        setItems([]);
        return;
      }
      setError(null);
      setItems(Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <div className="mx-auto max-w-3xl border border-brand-ink/10 bg-brand-surface px-6 py-12 text-center">
        <p className="text-sm text-brand-ink/55">Loading progress…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tighter text-brand-ink sm:text-3xl">Progress</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink/60">
          Updates as you finish lessons and quizzes.
        </p>
      </header>
      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}
      {items.length === 0 ? (
        <div className="border border-dashed border-brand-ink/15 bg-brand-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-brand-ink/60">
            You are not enrolled in any courses yet.{" "}
            <Link href="/courses" className="font-semibold text-brand-accent hover:underline">
              Browse the catalog
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((c) => (
            <li key={c.slug} className="border border-brand-ink/10 bg-brand-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-semibold text-brand-ink">{c.title}</p>
                  <p className="mt-1 text-xs text-brand-ink/45">
                    {c.lesson_done} of {c.lessons} items completed
                    {c.instructor_name ? ` · ${c.instructor_name}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-brand-ink">{c.progress_pct}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden bg-brand-muted">
                <div className="h-full bg-brand-accent transition-all" style={{ width: `${Math.min(100, c.progress_pct)}%` }} />
              </div>
              <Link
                href={`/learn/${c.slug}`}
                className="mt-4 inline-block text-sm font-semibold text-brand-accent hover:text-brand-accent-dark"
              >
                Continue learning
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/dashboard" className="inline-block text-sm font-semibold text-brand-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
