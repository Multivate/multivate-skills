"use client";

import { DonutChart, RevenueBarChart } from "@/components/dashboard/admin-analytics-charts";

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
  growth?: {
    users: { date: string; count: number }[];
    enrollments: { date: string; count: number }[];
    revenue: { date: string; amount_cents: number }[];
  };
  mentor_stats?: {
    approved_profiles: number;
    pending_profiles: number;
    total_conversations: number;
    mentors_who_replied: number;
  };
};

export function AdminAnalyticsDashboard({
  data,
  lastUpdated,
}: {
  data: AdminAnalyticsData;
  lastUpdated?: Date | null;
  live?: boolean;
}) {
  const growth = data.growth ?? { users: [], enrollments: [], revenue: [] };
  const mentors = data.mentor_stats ?? {
    approved_profiles: 0,
    pending_profiles: 0,
    total_conversations: 0,
    mentors_who_replied: 0,
  };
  const revenue = growth.revenue.map((point) => ({ date: point.date, value: point.amount_cents }));
  const mentorSegments = [
    { label: "Approved", value: mentors.approved_profiles, color: "#1F8A4C" },
    { label: "Waiting", value: mentors.pending_profiles, color: "#E07A2F" },
  ].filter((segment) => segment.value > 0);
  const replyRate =
    mentors.approved_profiles > 0 ? Math.round((mentors.mentors_who_replied / mentors.approved_profiles) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="admin-muted mt-1 text-sm">
          Daily revenue and mentor replies.
          {lastUpdated ? ` Updated ${lastUpdated.toLocaleTimeString()}.` : ""}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">Completed revenue</h2>
          <p className="admin-muted mt-1 text-xs">Last 30 days</p>
          <div className="mt-4">
            <RevenueBarChart points={revenue} />
          </div>
        </section>

        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">Mentors</h2>
          <p className="admin-muted mt-1 text-xs">Approvals and who has replied</p>
          {mentorSegments.length === 0 ? (
            <p className="admin-muted mt-6 text-sm">No mentor profiles yet.</p>
          ) : (
            <>
              <div className="mt-4">
                <DonutChart
                  segments={mentorSegments}
                  centerLabel={String(mentors.approved_profiles + mentors.pending_profiles)}
                />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="admin-muted">Approved mentors who replied</span>
                  <span className="font-semibold tabular-nums">
                    {mentors.mentors_who_replied}/{mentors.approved_profiles}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--admin-soft)]">
                  <div className="h-full rounded-full bg-[#1F8A4C]" style={{ width: `${replyRate}%` }} />
                </div>
                <p className="admin-muted mt-3 text-xs">
                  {mentors.total_conversations} conversation{mentors.total_conversations === 1 ? "" : "s"}
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
