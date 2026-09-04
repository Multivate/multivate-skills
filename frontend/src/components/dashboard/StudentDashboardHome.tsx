"use client";

import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import {
  DashboardMetricStrip,
  DashboardPageHeader,
  DashboardPanel,
  DashboardQuietLink,
  DashboardState,
} from "@/components/dashboard/dashboard-ui";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
    return <DashboardState>Loading your learning data…</DashboardState>;
  }

  if (error) {
    return (
      <DashboardState tone="error">
        <p className="font-semibold">{error}</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-brand-accent hover:text-brand-accent-dark">
          Sign in
        </Link>
      </DashboardState>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <DashboardPageHeader
        eyebrow="Student"
        title="Learning home"
        description={`${tProfile("bannerTitle")}. ${tProfile("bannerBody")}`}
      />

      <DashboardMetricStrip
        items={[
          {
            label: "Enrolled",
            value: stats.enrolled,
            hint: <DashboardQuietLink href="/dashboard/courses">View courses</DashboardQuietLink>,
          },
          { label: "Avg progress", value: `${stats.avg}%` },
          {
            label: "Lessons done",
            value: stats.lessonsDone,
            hint: <span>of {stats.lessonsTotal} total</span>,
          },
          {
            label: "Payments",
            value: "-",
            hint: <DashboardQuietLink href="/dashboard/payments">Open payments</DashboardQuietLink>,
          },
        ]}
      />

      <DashboardPanel
        title={tRec("title")}
        description={tRec("subtitle")}
        action={<DashboardQuietLink href="/courses">{tRec("browse")}</DashboardQuietLink>}
      >
        {recommendations.length === 0 ? (
          <p className="text-sm text-brand-ink/60">{tRec("empty")}</p>
        ) : (
          <div className="flex gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className="group w-[min(100%,18rem)] min-w-[16.5rem] shrink-0 border-y border-r border-brand-ink/10 first:border-l bg-brand-paper transition hover:bg-white"
                >
                  <div className="relative aspect-[16/10] bg-brand-muted">
                    <CourseThumbnail src={course.image_url} alt={course.title} sizes="288px" className="object-cover" />
                  </div>
                  <div className="p-4">
                    {course.category ? (
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand-accent">{course.category}</p>
                    ) : null}
                    <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug text-brand-ink group-hover:text-brand-accent">
                      {course.title}
                    </h3>
                    {course.match_reasons?.[0] ? (
                      <p className="mt-2 line-clamp-1 text-xs text-brand-ink/55">{course.match_reasons[0]}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-brand-ink/60">
                      {tRec("lessons", { count: course.lessons_count })} · {formatCourseDuration(course.duration_minutes ?? 0)} ·{" "}
                      <span className="font-semibold text-brand-ink">
                        {priceLabel === "Free" ? tRec("free") : priceLabel}
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </DashboardPanel>

      {items.length > 0 ? (
        <DashboardPanel title={tRel("studentInstructorsTitle")} description={tRel("studentInstructorsSubtitle")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-ink/10 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">
                  <th className="pb-3 pr-4">{tRel("colCourse")}</th>
                  <th className="pb-3 pr-4">{tRel("colInstructor")}</th>
                  <th className="pb-3">{tRel("colEmail")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/10">
                {items.map((row) => (
                  <tr key={`instr-${row.slug}`}>
                    <td className="py-3.5 pr-4">
                      <Link href={`/courses/${row.slug}`} className="font-semibold text-brand-ink hover:text-brand-accent">
                        {row.title}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4 text-brand-ink/80">
                      {row.instructor_name?.trim() ? row.instructor_name : tRel("unassigned")}
                    </td>
                    <td className="py-3.5 text-xs text-brand-ink/55">
                      {row.instructor_email?.trim() ? row.instructor_email : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>
      ) : null}

      <DashboardPanel
        title="Continue learning"
        action={<DashboardQuietLink href="/courses">Browse catalog</DashboardQuietLink>}
      >
        {items.length === 0 ? (
          <p className="text-sm text-brand-ink/60">
            You have no enrollments yet.{" "}
            <Link href="/courses" className="font-semibold text-brand-accent hover:text-brand-accent-dark">
              Browse courses
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-brand-ink/10">
            {items.map((row) => (
              <li key={row.slug}>
                <Link href={`/learn/${row.slug}`} className="group flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-full shrink-0 overflow-hidden bg-brand-muted sm:h-16 sm:w-28">
                    <CourseThumbnail src={row.image_url} alt={row.image_alt} sizes="112px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-display text-base font-semibold text-brand-ink group-hover:text-brand-accent">
                        {row.title}
                      </h3>
                      <span className="text-xs font-medium uppercase tracking-wide text-brand-ink/45">{row.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-brand-ink/60">
                      Lesson {row.lesson_done} of {row.lessons}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1 flex-1 bg-brand-muted">
                        <div
                          className="h-full bg-brand-accent"
                          style={{ width: `${Math.min(100, Math.max(0, row.progress_pct))}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-brand-ink">{row.progress_pct}%</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </div>
  );
}
