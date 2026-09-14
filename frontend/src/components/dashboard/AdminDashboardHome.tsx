"use client";

import { formatMoney, formatMoneyCompact } from "@/lib/format-money";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import {
  DashboardMetricStrip,
  DashboardPageHeader,
  DashboardPanel,
  DashboardQuietLink,
  DashboardState,
} from "@/components/dashboard/dashboard-ui";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type AdminDashboard = {
  totals: {
    total_users: number;
    total_courses: number;
    total_enrollments: number;
    revenue_completed_cents: number;
    payments_pending_count: number;
  };
  top_courses: { slug: string; title: string; image_url: string; enrollment_count: number }[];
  recent_users: { id: string; name: string; email: string; role: string; is_active: boolean; created_at: string }[];
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
};

export function AdminDashboardHome() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          setError("Your session expired. Please sign in again.");
          return;
        }
        if (!res.ok) {
          setError(typeof body?.detail === "string" ? body.detail : "We couldn't load the admin dashboard.");
          return;
        }
        setData(body as AdminDashboard);
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
        <Link href="/login" className="mt-4 inline-block font-semibold text-brand-accent hover:text-brand-accent-dark">
          Sign in
        </Link>
      </DashboardState>
    );
  }

  if (!data) {
    return <DashboardState>Loading platform metrics…</DashboardState>;
  }

  const { totals } = data;

  return (
    <div className="mx-auto max-w-[90rem] space-y-10">
      <DashboardPageHeader
        eyebrow="Administration"
        title="Platform overview"
        description="Users, enrollments, and revenue."
      />

      <DashboardMetricStrip
        items={[
          { label: "Users", value: totals.total_users },
          { label: "Enrollments", value: totals.total_enrollments },
          { label: "Courses", value: totals.total_courses },
          {
            label: "Revenue",
            value: formatMoneyCompact(totals.revenue_completed_cents),
            hint: <span title={formatMoney(totals.revenue_completed_cents)}>Completed payments</span>,
          },
          {
            label: "Pending",
            value: totals.payments_pending_count,
            hint: <DashboardQuietLink href="/dashboard/admin/payments">Review payments</DashboardQuietLink>,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <DashboardPanel title="Recent enrollments" description="Latest learner activity" className="xl:col-span-5">
          {data.recent_enrollments.length === 0 ? (
            <p className="text-sm text-brand-ink/60">No enrollments yet.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-brand-ink/10 overflow-y-auto">
              {data.recent_enrollments.map((e) => (
                <li key={`${e.user_email}-${e.course_slug}-${e.created_at}`} className="py-3.5">
                  <p className="font-semibold text-brand-ink">{e.course_title}</p>
                  <p className="mt-1 text-xs text-brand-ink/55">
                    {e.user_name} · {new Date(e.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel title="Top courses" className="xl:col-span-4">
          {data.top_courses.length === 0 ? (
            <p className="text-sm text-brand-ink/60">No courses in catalog.</p>
          ) : (
            <ul className="divide-y divide-brand-ink/10">
              {data.top_courses.map((c) => (
                <li key={c.slug} className="flex items-center gap-3 py-3">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden bg-brand-muted">
                    <CourseThumbnail src={c.image_url} alt={c.title} sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-ink">{c.title}</p>
                    <p className="text-xs text-brand-ink/55">{c.enrollment_count} enrollments</p>
                  </div>
                  <DashboardQuietLink href={`/courses/${c.slug}`}>View</DashboardQuietLink>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Recent payments"
          action={<DashboardQuietLink href="/dashboard/admin/payments">Workspace</DashboardQuietLink>}
          className="xl:col-span-3"
        >
          {data.recent_payments.length === 0 ? (
            <p className="text-sm text-brand-ink/60">No payment records.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-brand-ink/10 overflow-y-auto">
              {data.recent_payments.map((p) => (
                <li key={p.id} className="py-3">
                  <p className="font-semibold text-brand-ink">{formatMoney(p.amount_cents, p.currency)}</p>
                  <p className="mt-1 text-xs text-brand-ink/55">
                    {p.status} · {p.user_email}
                  </p>
                  {p.course_title ? <p className="mt-0.5 text-xs text-brand-ink/45">{p.course_title}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Recent users"
        action={
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <DashboardQuietLink href="/dashboard/admin/users">Manage users</DashboardQuietLink>
            <DashboardQuietLink href="/dashboard/admin/student-profiles">Student profiles</DashboardQuietLink>
            <DashboardQuietLink href="/dashboard/admin/instructor-profiles">Instructor profiles</DashboardQuietLink>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-ink/10 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/10">
              {data.recent_users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3.5 pr-4">
                    <p className="font-semibold text-brand-ink">{u.name}</p>
                    <p className="truncate text-xs text-brand-ink/50">{u.email}</p>
                  </td>
                  <td className="py-3.5 pr-4 capitalize text-brand-ink/80">{u.role}</td>
                  <td className="py-3.5 pr-4 text-xs text-brand-ink/55">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3.5 text-xs font-semibold">
                    {u.is_active ? <span className="text-brand-ink">Active</span> : <span className="text-brand-ink/40">Inactive</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
    </div>
  );
}
