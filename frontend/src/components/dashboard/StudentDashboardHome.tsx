"use client";

import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Clock, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCourseDuration, formatCoursePrice } from "@/lib/course-price";

type RecommendedCourse = {
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  image_url: string;
  category?: string;
  level?: string;
  duration_minutes?: number;
  lessons_count: number;
  price_cents?: number;
  currency?: string;
  is_free?: boolean;
  match_reasons?: string[];
};

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

function StatProgressRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative mx-auto h-[5.5rem] w-[5.5rem] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#F27D0C"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-extrabold tabular-nums text-brand-ink">{pct}%</span>
      </div>
    </div>
  );
}

export function StudentDashboardHome() {
  const tProfile = useTranslations("dashboard.learningProfile");
  const tRec = useTranslations("dashboard.recommendations");
  const tRel = useTranslations("dashboard.relationships");
  const [items, setItems] = useState<MyCourseItem[] | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [coursesRes, recRes] = await Promise.all([
          fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" }),
          fetch("/api/learning/recommendations", { credentials: "include", cache: "no-store" }),
        ]);
        const coursesData = await coursesRes.json().catch(() => null);
        const recData = await recRes.json().catch(() => null);
        if (cancelled) return;
        if (coursesRes.status === 401) {
          setError("Your session expired. Please sign in again.");
          setItems([]);
          setRecommendations([]);
          return;
        }
        if (!coursesRes.ok) {
          setError(typeof coursesData?.detail === "string" ? coursesData.detail : "We couldn't load your courses.");
          setItems([]);
          setRecommendations([]);
          return;
        }
        setError(null);
        setItems(Array.isArray(coursesData) ? (coursesData as MyCourseItem[]) : []);
        setRecommendations(recRes.ok && Array.isArray(recData) ? (recData as RecommendedCourse[]) : []);
      } catch {
        if (!cancelled) {
          setError("Connection problem. Please try again.");
          setItems([]);
          setRecommendations([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!items || items.length === 0) {
      return { enrolled: 0, avg: 0, lessonsDone: 0, lessonsTotal: 0 };
    }
    const enrolled = items.length;
    const avg = Math.round(items.reduce((s, i) => s + i.progress_pct, 0) / enrolled);
    const lessonsDone = items.reduce((s, i) => s + i.lesson_done, 0);
    const lessonsTotal = items.reduce((s, i) => s + i.lessons, 0);
    return { enrolled, avg, lessonsDone, lessonsTotal };
  }, [items]);

  if (items === null || recommendations === null) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Loading your learning data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200/90 bg-red-50/80 p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-900">{error}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 px-4 py-3 shadow-sm sm:px-5">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-brand-ink dark:text-slate-100">{tProfile("bannerTitle")}</span>. {tProfile("bannerBody")}
        </p>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enrolled courses</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-brand-ink">{stats.enrolled}</p>
          <Link href="/dashboard/courses" className="mt-3 inline-block text-xs font-semibold text-brand-primary hover:underline">
            View all courses
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average progress</p>
          <div className="mt-1 flex justify-center">
            <StatProgressRing value={stats.avg} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lessons completed</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-brand-ink">{stats.lessonsDone}</p>
          <p className="mt-1 text-sm font-medium text-slate-600">Across {stats.lessonsTotal} catalog lessons</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</p>
          <p className="mt-2 text-sm text-slate-600">View your recorded payment attempts.</p>
          <Link href="/dashboard/payments" className="mt-3 inline-block text-xs font-semibold text-brand-primary hover:underline">
            View payments
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand-ink sm:text-xl">
              <Sparkles className="h-5 w-5 text-brand-secondary" aria-hidden />
              {tRec("title")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{tRec("subtitle")}</p>
          </div>
          <Link href="/courses" className="shrink-0 text-sm font-semibold text-brand-primary hover:underline">
            {tRec("browse")}
          </Link>
        </div>
        {recommendations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">{tRec("empty")}</p>
        ) : (
          <div className="mt-5 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recommendations.map((course) => {
              const priceLabel = formatCoursePrice(
                course.price_cents ?? 0,
                course.currency ?? "NGN",
                course.is_free ?? false,
              );
              return (
                <Link
                  key={course.slug}
                  href={`/courses/${course.slug}`}
                  className="group w-[min(100%,18.5rem)] min-w-[17rem] max-w-[19rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-secondary/40 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900"
                >
                  <div className="relative aspect-[16/10] bg-slate-100">
                    <CourseThumbnail
                      src={course.image_url}
                      alt={course.title}
                      sizes="320px"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    {course.category ? (
                      <span className="absolute left-3 top-3 rounded-full bg-brand-ink/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        {course.category}
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-bold leading-snug text-brand-ink transition group-hover:text-brand-primary">
                      {course.title}
                    </h3>
                    {course.match_reasons && course.match_reasons.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {course.match_reasons.slice(0, 2).map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-brand-secondary/35 bg-brand-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-brand-ink"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-600">
                      <span>{tRec("lessons", { count: course.lessons_count })}</span>
                      <span className="text-slate-300" aria-hidden>
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-brand-secondary" aria-hidden />
                        {formatCourseDuration(course.duration_minutes ?? 0)}
                      </span>
                      <span className="text-slate-300" aria-hidden>
                        ·
                      </span>
                      <span className="font-bold text-brand-ink">{priceLabel === "Free" ? tRec("free") : priceLabel}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {items.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-extrabold tracking-tight text-brand-ink sm:text-xl">{tRel("studentInstructorsTitle")}</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{tRel("studentInstructorsSubtitle")}</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{tRel("colCourse")}</th>
                  <th className="px-4 py-3">{tRel("colInstructor")}</th>
                  <th className="px-4 py-3">{tRel("colEmail")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={`instr-${row.slug}`}>
                    <td className="px-4 py-3">
                      <Link href={`/courses/${row.slug}`} className="font-semibold text-brand-primary hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                      {row.instructor_name?.trim() ? row.instructor_name : tRel("unassigned")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.instructor_email?.trim() ? row.instructor_email : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-extrabold tracking-tight text-brand-ink sm:text-xl">Continue learning</h2>
          <Link href="/courses" className="text-sm font-semibold text-brand-primary hover:underline">
            Browse catalog
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            You have no enrollments yet.{" "}
            <Link href="/courses" className="font-semibold text-brand-primary hover:underline">
              Browse courses
            </Link>{" "}
            and enroll.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((row) => (
              <Link
                key={row.slug}
                href={`/learn/${row.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] w-full bg-slate-100">
                  <CourseThumbnail
                    src={row.image_url}
                    alt={row.image_alt}
                    sizes="(min-width: 1536px) 22vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      row.status === "Completed"
                        ? "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200/90"
                        : row.status === "In Progress"
                          ? "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90"
                          : "bg-slate-100 text-slate-700 ring-1 ring-slate-200/90"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold leading-snug text-brand-ink group-hover:text-brand-primary">{row.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">
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
        )}
      </section>
    </div>
  );
}
