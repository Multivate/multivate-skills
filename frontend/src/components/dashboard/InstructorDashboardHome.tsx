"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import {
  DashboardMetricStrip,
  DashboardPageHeader,
  DashboardPanel,
  DashboardQuietLink,
  DashboardState,
} from "@/components/dashboard/dashboard-ui";

type InstructorDashboard = {
  totals: {
    total_courses: number;
    total_enrollments: number;
    unique_learners: number;
    revenue_completed_cents: number;
  };
  courses: { slug: string; title: string; image_url: string; lessons_count: number; enrollment_count: number }[];
};

export function InstructorDashboardHome() {
  const [data, setData] = useState<InstructorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/instructor/dashboard", { credentials: "include", cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setError("You do not have access to the instructor area.");
          return;
        }
        if (!res.ok) {
          setError(typeof body?.detail === "string" ? body.detail : "We couldn't load your dashboard.");
          return;
        }
        setData(body as InstructorDashboard);
        setError(null);
      } catch {
        if (!cancelled) setError("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <DashboardState tone="error">
        <p className="font-semibold">{error}</p>
      </DashboardState>
    );
  }

  if (!data) {
    return <DashboardState>Loading your dashboard…</DashboardState>;
  }

  const { totals, courses } = data;

  return (
    <div className="mx-auto max-w-[90rem] space-y-10">
      <DashboardPageHeader
        eyebrow="Instructor"
        title="Teaching overview"
        description="Your courses, students, and earnings."
        action={
          <Link href="/dashboard/instructor/studio/new" className="btn-primary-brand !min-h-0 !min-w-0 !px-5 !py-2.5 text-sm">
            Create course
          </Link>
        }
      />

      <DashboardMetricStrip
        items={[
          { label: "Courses", value: totals.total_courses },
          { label: "Enrollments", value: totals.total_enrollments },
          { label: "Learners", value: totals.unique_learners },
          {
            label: "Revenue",
            value: formatMoneyCompact(totals.revenue_completed_cents),
            hint: <span title={formatMoney(totals.revenue_completed_cents)}>Completed</span>,
          },
        ]}
      />

      <DashboardPanel
        title="Courses you instruct"
        action={<DashboardQuietLink href="/dashboard/instructor/studio/new">New course</DashboardQuietLink>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-ink/10 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">
                <th className="pb-3 pr-4">Course</th>
                <th className="pb-3 pr-4">Lessons</th>
                <th className="pb-3 pr-4">Enrollments</th>
                <th className="pb-3"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/10">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-brand-ink/60">
                    No courses yet. Create one to publish under your instructor account.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.slug}>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden bg-brand-muted">
                          <CourseThumbnail src={c.image_url} alt={c.title} sizes="80px" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-brand-ink">{c.title}</p>
                          <p className="text-xs text-brand-ink/45">{c.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-semibold tabular-nums text-brand-ink">{c.lessons_count}</td>
                    <td className="py-4 pr-4 font-semibold tabular-nums text-brand-ink">{c.enrollment_count}</td>
                    <td className="py-4">
                      <DashboardQuietLink href={`/courses/${c.slug}`}>Open</DashboardQuietLink>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
    </div>
  );
}
