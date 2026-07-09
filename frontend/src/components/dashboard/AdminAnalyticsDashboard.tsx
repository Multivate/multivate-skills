"use client";

import { Link } from "@/i18n/navigation";
import { GraduationCap, MessageSquare, TrendingUp, Users } from "lucide-react";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { DonutChart, GrowthLineChart, RevenueBarChart } from "@/components/dashboard/admin-analytics-charts";
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
  student: "#4338CA",
  instructor: "#6366F1",
  mentor: "#F27D0C",
  admin: "#7C3AED",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
  title,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  accent?: boolean;
  title?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        accent ? "border-brand-accent/25 bg-brand-accent/5" : "border-slate-200/90 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-bold uppercase tracking-wide ${accent ? "text-brand-accent" : "text-slate-500"}`}>
          {label}
        </p>
        <span className={`rounded-lg p-2 ${accent ? "bg-brand-accent/15 text-brand-accent" : "bg-slate-100 text-admin-indigo"}`}>
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
      </div>
      <p className="mt-3 min-w-0 truncate text-2xl font-extrabold tabular-nums text-brand-ink sm:text-3xl" title={title}>
        {value}
      </p>
    </div>
  );
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

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink">Analytics</h1>
          <p className="mt-1 text-sm text-slate-600">Platform overview for the last 30 days.</p>
        </div>
        {live ? <DashboardLiveBadge lastUpdated={lastUpdated} /> : null}
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={totals.total_users} icon={Users} />
        <StatCard label="Enrollments" value={totals.total_enrollments} icon={GraduationCap} />
        <StatCard
          label="Completed revenue"
          value={formatMoneyCompact(totals.revenue_completed_cents)}
          icon={TrendingUp}
          title={formatMoney(totals.revenue_completed_cents)}
        />
        <StatCard label="Pending payments" value={totals.payments_pending_count} icon={TrendingUp} accent />
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 xl:col-span-8">
          <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Growth</h2>
          <p className="mt-1 text-xs text-slate-500">New users and enrollments per day</p>
          <div className="mt-4">
            <GrowthLineChart
              users={growth.users.map((p) => ({ date: p.date, value: p.count }))}
              enrollments={growth.enrollments.map((p) => ({ date: p.date, value: p.count }))}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 xl:col-span-4">
          <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Users by role</h2>
          <div className="mt-4">
            <DonutChart segments={roleSegments} centerLabel={String(totals.total_users)} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 xl:col-span-7">
          <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Revenue</h2>
          <p className="mt-1 text-xs text-slate-500">Completed payments per day</p>
          <div className="mt-4">
            <RevenueBarChart points={growth.revenue.map((p) => ({ date: p.date, value: p.amount_cents }))} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 xl:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Mentors</h2>
            <MessageSquare className="h-4 w-4 text-brand-accent" aria-hidden />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Live</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-ink">{mentorStats.approved_profiles}</dd>
            </div>
            <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-brand-accent">In review</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-ink">{mentorStats.pending_profiles}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Chats</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-ink">{mentorStats.total_conversations}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Replied</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-ink">{mentorStats.mentors_who_replied}</dd>
            </div>
          </dl>
          <Link href="/dashboard/admin/mentors" className="mt-4 inline-block text-xs font-bold text-admin-indigo hover:underline">
            Mentor approvals
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Top courses</h2>
          <ul className="mt-4 space-y-3">
            {data.top_courses.length === 0 ? (
              <li className="text-sm text-slate-500">No courses yet.</li>
            ) : (
              data.top_courses.slice(0, 6).map((c) => (
                <li key={c.slug} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                    <CourseThumbnail src={c.image_url} alt={c.title} sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-brand-ink">{c.title}</p>
                    <p className="text-xs text-slate-500">{c.enrollment_count} enrollments</p>
                  </div>
                  <Link href={`/courses/${c.slug}`} className="shrink-0 text-xs font-bold text-admin-indigo hover:underline">
                    View
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Recent enrollments</h2>
              <Link href="/dashboard/admin/enrollments" className="text-xs font-bold text-admin-indigo hover:underline">
                View all
              </Link>
            </div>
            <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto">
              {data.recent_enrollments.length === 0 ? (
                <li className="text-sm text-slate-500">No enrollments yet.</li>
              ) : (
                data.recent_enrollments.slice(0, 6).map((e) => (
                  <li key={`${e.user_email}-${e.course_slug}-${e.created_at}`} className="rounded-lg border border-slate-100 px-3 py-2">
                    <p className="text-sm font-semibold text-brand-ink">{e.course_title}</p>
                    <p className="text-xs text-slate-500">
                      {e.user_name} · {new Date(e.created_at).toLocaleDateString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold tracking-tight text-brand-ink">Recent payments</h2>
              <Link href="/dashboard/admin/payments" className="text-xs font-bold text-admin-indigo hover:underline">
                View all
              </Link>
            </div>
            <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto">
              {data.recent_payments.length === 0 ? (
                <li className="text-sm text-slate-500">No payments yet.</li>
              ) : (
                data.recent_payments.slice(0, 6).map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <p className="text-sm font-semibold text-brand-ink">{formatMoney(p.amount_cents, p.currency)}</p>
                    <p className="text-xs capitalize text-slate-500">
                      {p.status} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
