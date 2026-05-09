"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
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
};

function statusBadgeClass(status: string) {
  if (status === "Completed") return "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200/90";
  if (status === "In Progress") return "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200/90";
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
          setError("Your session expired — please sign in again.");
          setItems([]);
          return;
        }
        if (!res.ok) {
          const detail = data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : "Could not load courses.";
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
          setError("Network error — is the Next.js server running?");
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
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/90 bg-white p-10 text-center shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-600">Loading your courses…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <DashboardSavedCart />
        <div className="rounded-2xl border border-red-200/90 bg-red-50/80 p-8 text-center shadow-sm sm:p-10">
          <h1 className="text-lg font-extrabold text-brand-ink">Could not load courses</h1>
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
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm dark:border-slate-800/90 dark:bg-slate-900 sm:p-10">
          <h1 className="text-lg font-extrabold text-brand-ink sm:text-xl">My courses</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
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
                <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">My courses</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Enrollments and progress stay in sync with your learning workspace.
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
                  href={`/courses/${row.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900"
                >
                  <div className="relative aspect-[16/10] w-full bg-slate-100">
                    <Image
                      src={row.image_url}
                      alt={row.image_alt}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                    />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="font-bold leading-snug text-brand-ink group-hover:text-brand-primary">{row.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{row.description}</p>
                    <p className="mt-3 text-sm text-slate-600">
                      Lesson {row.lesson_done} of {row.lessons}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-accent"
                          style={{ width: `${Math.min(100, Math.max(0, row.progress_pct))}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-slate-700">{row.progress_pct}%</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/90 dark:bg-slate-900 sm:p-8">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Rate a course</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Share quick feedback on courses you are enrolled in. You can update your review anytime — only enrolled
              learners can submit ratings.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
                Course
                <select
                  value={revSlug || items[0]?.slug || ""}
                  onChange={(e) => setRevSlug(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {items.map((row) => (
                    <option key={row.slug} value={row.slug}>
                      {row.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Rating (1–5)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={revRating}
                  onChange={(e) => setRevRating(Number(e.target.value) || 1)}
                  className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
                Comment (optional)
                <textarea
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            {revMsg ? <p className="mt-4 text-sm font-medium text-slate-800">{revMsg}</p> : null}
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
                    setRevMsg(typeof data?.detail === "string" ? data.detail : "Could not save review.");
                    return;
                  }
                  setRevMsg("Thanks — your review was saved.");
                } catch {
                  setRevMsg("Network error.");
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
