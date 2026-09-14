"use client";

import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { DonutChart, GrowthLineChart, RevenueBarChart } from "@/components/dashboard/admin-analytics-charts";
import {
  DashboardMetricStrip,
  DashboardPageHeader,
  DashboardPanel,
  DashboardQuietLink,
} from "@/components/dashboard/dashboard-ui";
import { DashboardLiveBadge } from "@/components/dashboard/DashboardLiveBadge";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";

export type AdminAnalyticsData = {
  totals: {
    total_users: number;
    total_courses: number;
    total_enrollments: number;
    revenue_completed_cents: number;
    payments_pending_count: number;
    avg_progress_pct?: number;
  };
  top_courses: { slug: string; title: string; image_url: string; enrollment_count: number }[];
  recent_enrollments: {
    user_name: string;
    user_email: string;
    course_title: string;
    course_slug: string;
    created_at: string;
  }[];
  recent_payments: {
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    created_at: string;
    user_email: string;
    course_slug: string | null;
    course_title: string | null;
  }[];
  growth?: {
    users: { date: string; count: number }[];
    enrollments: { date: string; count: number }[];
    revenue: { date: string; amount_cents: number }[];
  };
  users_by_role?: { role: string; count: number }[];
  mentor_stats?: {
    approved_profiles: number;
    pending_profiles: number;
    total_conversations: number;
    mentors_who_replied: number;
  };
};

const ROLE_LABELS: Record<string, string> = {
  student: "Students",
  instructor: "Instructors",
  mentor: "Mentors",
  admin: "Admins",
};

const ROLE_COLORS: Record<string, string> = {
  student: "#0E1420",
  instructor: "#3A4660",
  mentor: "#C45F08",
  admin: "#E8790A",
};

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function paymentStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "success" || s === "paid") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (s === "pending" || s === "processing") {
    return "bg-amber-50 text-amber-900";
  }
  if (s === "failed" || s === "cancelled" || s === "canceled") {
    return "bg-red-50 text-red-800";
  }
  return "bg-brand-muted text-brand-ink/70";
}

export function AdminAnalyticsDashboard({
  data,
  lastUpdated,
  live = false,
}: {
  data: AdminAnalyticsData;
  lastUpdated?: Date | null;
  live?: boolean;
}) {
  const { totals } = data;
  const growth = data.growth ?? { users: [], enrollments: [], revenue: [] };
  const mentorStats = data.mentor_stats ?? {
    approved_profiles: 0,
    pending_profiles: 0,
    total_conversations: 0,
    mentors_who_replied: 0,
  };

  const roleSegments = (data.users_by_role ?? [])
    .filter((r) => r.count > 0)
    .map((r) => ({
      label: ROLE_LABELS[r.role] ?? r.role,
      value: r.count,
      color: ROLE_COLORS[r.role],
    }));

  const avgProgress =
    typeof totals.avg_progress_pct === "number" && Number.isFinite(totals.avg_progress_pct)
      ? Math.round(totals.avg_progress_pct)
      : null;

  return (
    <div className="mx-auto max-w-[90rem] space-y-10">
      <DashboardPageHeader
        eyebrow="Administration"
        title="Analytics"
        description="Last 30 days."
        action={live ? <DashboardLiveBadge lastUpdated={lastUpdated} /> : undefined}
      />

      <DashboardMetricStrip
        items={[
          {
            label: "Users",
            value: totals.total_users,
            hint: `${totals.total_courses} courses published`,
          },
          {
            label: "Enrollments",
            value: totals.total_enrollments,
            hint: avgProgress !== null ? `${avgProgress}% avg. progress` : "Active learner seats",
          },
          {
            label: "Revenue",
            value: formatMoneyCompact(totals.revenue_completed_cents),
            hint: (
              <span title={formatMoney(totals.revenue_completed_cents)}>Completed payments</span>
            ),
          },
          {
            label: "Pending",
            value: totals.payments_pending_count,
            hint: <DashboardQuietLink href="/dashboard/admin/payments">Review payments</DashboardQuietLink>,
          },
        ]}
      />

      <section className="grid gap-6 xl:grid-cols-12">
        <DashboardPanel
          title="Growth"
          description="New users and enrollments per day"
          className="xl:col-span-8"
        >
          <GrowthLineChart
            users={growth.users.map((p) => ({ date: p.date, value: p.count }))}
            enrollments={growth.enrollments.map((p) => ({ date: p.date, value: p.count }))}
          />
        </DashboardPanel>

        <DashboardPanel title="Users by role" description="Share of total accounts" className="xl:col-span-4">
          <DonutChart segments={roleSegments} centerLabel={String(totals.total_users)} />
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <DashboardPanel
          title="Revenue"
          description="Completed payment volume by day"
          className="xl:col-span-8"
        >
          <RevenueBarChart points={growth.revenue.map((p) => ({ date: p.date, value: p.amount_cents }))} />
        </DashboardPanel>

        <DashboardPanel
          title="Mentorship"
          description="Directory and conversation health"
          action={<DashboardQuietLink href="/dashboard/admin/mentors">Approvals</DashboardQuietLink>}
          className="xl:col-span-4"
        >
          <dl className="grid grid-cols-2 gap-px overflow-hidden border border-brand-ink/10 bg-brand-ink/10">
            {[
              { label: "Live mentors", value: mentorStats.approved_profiles },
              { label: "In review", value: mentorStats.pending_profiles, accent: true },
              { label: "Conversations", value: mentorStats.total_conversations },
              { label: "Mentors replied", value: mentorStats.mentors_who_replied },
            ].map((item) => (
              <div key={item.label} className="bg-white px-4 py-4">
                <dt
                  className={`text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${
                    item.accent ? "text-brand-accent" : "text-brand-ink/45"
                  }`}
                >
                  {item.label}
                </dt>
                <dd className="mt-2 font-display text-2xl font-bold tabular-nums text-brand-ink">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <DashboardPanel
          title="Top courses"
          description="Highest enrollment in the catalog"
          className="xl:col-span-5"
        >
          {data.top_courses.length === 0 ? (
            <p className="text-sm text-brand-ink/60">No courses yet.</p>
          ) : (
            <ul className="divide-y divide-brand-ink/10">
              {data.top_courses.slice(0, 6).map((c, index) => (
                <li key={c.slug} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="w-5 shrink-0 text-sm font-semibold tabular-nums text-brand-ink/35">
                    {index + 1}
                  </span>
                  <div className="relative h-11 w-16 shrink-0 overflow-hidden bg-brand-muted">
                    <CourseThumbnail src={c.image_url} alt={c.title} sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-ink">{c.title}</p>
                    <p className="mt-0.5 text-xs text-brand-ink/55">
                      {c.enrollment_count} enrollment{c.enrollment_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <DashboardQuietLink href={`/courses/${c.slug}`}>View</DashboardQuietLink>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Recent enrollments"
          description="Latest learner sign-ups"
          action={<DashboardQuietLink href="/dashboard/admin/enrollments">View all</DashboardQuietLink>}
          className="xl:col-span-3"
        >
          {data.recent_enrollments.length === 0 ? (
            <p className="text-sm text-brand-ink/60">No enrollments yet.</p>
          ) : (
            <ul className="divide-y divide-brand-ink/10">
              {data.recent_enrollments.slice(0, 7).map((e) => (
                <li key={`${e.user_email}-${e.course_slug}-${e.created_at}`} className="py-3 first:pt-0 last:pb-0">
                  <p className="truncate text-sm font-semibold text-brand-ink">{e.course_title}</p>
                  <p className="mt-1 truncate text-xs text-brand-ink/55">
                    {e.user_name}
                    <span className="text-brand-ink/30"> · </span>
                    {formatDay(e.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Recent payments"
          description="Latest checkout activity"
          action={<DashboardQuietLink href="/dashboard/admin/payments">View all</DashboardQuietLink>}
          className="xl:col-span-4"
        >
          {data.recent_payments.length === 0 ? (
            <p className="text-sm text-brand-ink/60">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-brand-ink/10">
              {data.recent_payments.slice(0, 7).map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums text-brand-ink">
                      {formatMoney(p.amount_cents, p.currency)}
                    </p>
                    <p className="mt-1 truncate text-xs text-brand-ink/55">
                      {p.course_title || p.user_email}
                      <span className="text-brand-ink/30"> · </span>
                      {formatDay(p.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${paymentStatusClass(p.status)}`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}
