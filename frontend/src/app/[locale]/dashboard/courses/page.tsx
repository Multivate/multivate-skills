"use client";

import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { formInputClass, formLabelClass, formTextareaClass } from "@/lib/form-styles";
import { DashboardSavedCart } from "@/components/dashboard/DashboardSavedCart";

type MyCourseItem = {
  slug: string;
  title: string;
  description: string;
  image_url: string;
  image_alt: string;
  lessons: number;
  lesson_done: number;
  progress_pct: number;
  status: string;
  instructor_name?: string | null;
  instructor_email?: string | null;
  duration_minutes?: number;
  current_week_title?: string;
};

function statusBadgeClass(status: string) {
  if (status === "Completed") return "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200/90";
  if (status === "In Progress") return "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90";
  return "bg-neutral-100 text-zinc-700 ring-1 ring-neutral-200/90";
}

export default function DashboardCoursesPage() {
  const [items, setItems] = useState<MyCourseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revSlug, setRevSlug] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [revBusy, setRevBusy] = useState(false);
  const [revMsg, setRevMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          setError("Your session expired. Please sign in again.");
          setItems([]);
          return;
        }
        if (!res.ok) {
          const detail = data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : "We couldn't load your courses.";
          setError(detail);
          setItems([]);
          return;
        }
        if (!Array.isArray(data)) {
          setError("Unexpected response from server.");
          setItems([]);
          return;
        }
        setError(null);
        setItems(data as MyCourseItem[]);
      } catch {
        if (!cancelled) {
          setError("We could not reach the server. Check your connection and try again.");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border border-neutral-200/90 bg-brand-surface p-10 text-center shadow-none dark:border-zinc-800/90 dark:bg-zinc-900">
        <p className="text-sm font-medium text-neutral-500">Loading your courses…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <DashboardSavedCart />
        <div className="rounded-md border border-red-200/90 bg-red-50/80 p-8 text-center shadow-none sm:p-10">
          <h1 className="text-lg font-semibold text-brand-ink">We could not load your courses</h1>
          <p className="mt-2 text-sm text-red-900/90">{error}</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand-primary hover:underline">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const hasEnrollments = items.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <DashboardSavedCart />

      {!hasEnrollments ? (
        <div className="rounded-md border border-neutral-200/90 bg-brand-surface p-8 text-center shadow-none dark:border-zinc-800/90 dark:bg-zinc-900 sm:p-10">
          <h1 className="text-lg font-semibold text-brand-ink sm:text-xl">My courses</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            You have not enrolled in any courses yet. Saved courses from your cart appear above; browse the catalog to
            add more, then enroll when you are ready.
          </p>
          <Link href="/courses" className="btn-primary-brand mt-6 inline-flex">
            Browse courses
          </Link>
        </div>
      ) : (
        <>
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tighter text-brand-ink sm:text-2xl">My courses</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Enrollments and progress stay up to date on your dashboard.
                </p>
              </div>
              <Link href="/courses" className="text-sm font-semibold text-brand-primary hover:underline">
                Browse more
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((row) => (
                <Link
                  key={row.slug}
                  href={`/learn/${row.slug}`}
                  className="group flex flex-col overflow-hidden rounded-md border border-neutral-200/90 bg-brand-surface shadow-none transition hover:border-neutral-300 hover:shadow-sm dark:border-zinc-800/90 dark:bg-zinc-900"
                >
                  <div className="relative aspect-[16/10] w-full bg-neutral-100">
                    <CourseThumbnail
                      src={row.image_url}
                      alt={row.image_alt}
                      sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="font-bold leading-snug text-brand-ink group-hover:text-brand-primary">{row.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-500">{row.description}</p>
                    <p className="mt-3 text-sm text-neutral-500">
                      {row.current_week_title ? `${row.current_week_title}. ` : ""}
                      Lesson {row.lesson_done} of {row.lessons}
                      {row.duration_minutes ? ` · ${row.duration_minutes} min` : ""}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-brand-accent"
                          style={{ width: `${Math.min(100, Math.max(0, row.progress_pct))}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-zinc-700">{row.progress_pct}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <section className="rounded-md border border-neutral-200/90 bg-brand-surface p-6 shadow-none dark:border-zinc-800/90 dark:bg-zinc-900 sm:p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Rate a course</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Share feedback on courses you are enrolled in. You can update your review anytime. Only enrolled
              learners can submit ratings.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className={`${formLabelClass} sm:col-span-2`}>
                Course
                <select
                  value={revSlug || items[0]?.slug || ""}
                  onChange={(e) => setRevSlug(e.target.value)}
                  className={`${formInputClass} max-w-md`}
                >
                  {items.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className={formLabelClass}>
                Rating (1-5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={revRating}
                  onChange={(e) => setRevRating(Number(e.target.value) || 1)}
                  className={`${formInputClass} max-w-xs`}
                />
              </label>
              <label className={`${formLabelClass} sm:col-span-2`}>
                Comment (optional)
                <textarea
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  rows={3}
                  className={formTextareaClass}
                />
              </label>
            </div>
            {revMsg ? <p className="mt-4 text-sm font-medium text-zinc-800">{revMsg}</p> : null}
            <button
              type="button"
              disabled={revBusy}
              onClick={async () => {
                setRevMsg(null);
                setRevBusy(true);
                try {
                  const res = await fetch("/api/reviews", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      course_slug: revSlug || items[0]?.slug,
                      rating: revRating,
                      comment: revComment.trim() || null,
                    }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) {
                    setRevMsg(typeof data?.detail === "string" ? data.detail : "We couldn't save your review.");
                    return;
                  }
                  setRevMsg("Thanks. Your review was saved.");
                } catch {
                  setRevMsg("Connection problem. Please try again.");
                } finally {
                  setRevBusy(false);
                }
              }}
              className="btn-primary-brand mt-6 !px-6 !py-2.5 text-sm disabled:opacity-60"
            >
              {revBusy ? "Saving…" : "Submit review"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
