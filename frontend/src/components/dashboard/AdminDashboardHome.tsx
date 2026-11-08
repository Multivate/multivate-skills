"use client";

import { BookOpen, CreditCard, RefreshCw, UserCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { CourseColumnChart, DonutChart, GrowthLineChart } from "@/components/dashboard/admin-analytics-charts";
import { useAdminConsole, type AdminDash } from "@/components/dashboard/AdminShell";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { useAuth } from "@/contexts/auth-context";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";
import { Link } from "@/i18n/navigation";

const RANGES = [7, 14, 30] as const;

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  instructor: "Instructor",
  mentor: "Mentor",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  student: "#1457D0",
  instructor: "#7C5CDB",
  mentor: "#1F8A4C",
  admin: "#E07A2F",
};

const ROLE_PILL: Record<string, string> = {
  student: "bg-[#E7F1FC] text-[#1457D0]",
  instructor: "bg-[#EEE9FF] text-[#5B45D6]",
  mentor: "bg-[#E5F6EC] text-[#1F8A4C]",
  admin: "bg-[#FFF1E4] text-[#C56A1A]",
};

const PAYMENT_PILL: Record<string, string> = {
  completed: "bg-[#E5F6EC] text-[#1F8A4C]",
  paid: "bg-[#E5F6EC] text-[#1F8A4C]",
  pending: "bg-[#FFF4DE] text-[#A56B00]",
  failed: "bg-[#FDECEC] text-[#C2414A]",
};

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function sliceDays<T>(rows: T[] | undefined, days: number) {
  return (rows ?? []).slice(-days);
}

function timeAgo(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function roleCountLine(rows: AdminDash["users_by_role"]) {
  return rows
    .filter((row) => row.count > 0)
    .map((row) => {
      const word = ROLE_LABELS[row.role] ?? row.role;
      return `${row.count} ${row.count === 1 ? word.toLowerCase() : `${word.toLowerCase()}s`}`;
    })
    .join(" · ");
}

export function AdminDashboardHome() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAdminConsole();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);

  const roles = useMemo(
    () =>
      (data?.users_by_role ?? [])
        .filter((row) => row.count > 0)
        .map((row) => ({
          label: row.count === 1 ? (ROLE_LABELS[row.role] ?? row.role) : `${ROLE_LABELS[row.role] ?? row.role}s`,
          value: row.count,
          color: ROLE_COLORS[row.role] ?? "#1457D0",
        })),
    [data],
  );

  if (error) {
    return (
      <div className="admin-card rounded-2xl px-5 py-8 text-sm">
        <p>{error}</p>
        <Link href="/login?from=/admin" className="mt-3 inline-block font-semibold text-[#1457D0]">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading || !data) {
    return <p className="admin-muted text-sm">Loading the admin overview…</p>;
  }

  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const pendingPayments = data.totals.payments_pending_count;
  const pendingMentors = data.mentor_stats?.pending_profiles ?? 0;
  const notices = [
    pendingPayments > 0 ? `${pendingPayments} payment${pendingPayments === 1 ? "" : "s"} waiting for a decision.` : null,
    pendingMentors > 0 ? `${pendingMentors} mentor application${pendingMentors === 1 ? "" : "s"} waiting.` : null,
  ].filter((line): line is string => Boolean(line));
  const noticeHref = pendingPayments > 0 ? "/admin/payments" : "/admin/mentors";
  const users = sliceDays(data.growth?.users, days).map((row) => ({ date: row.date, value: row.count }));
  const enrollments = sliceDays(data.growth?.enrollments, days).map((row) => ({ date: row.date, value: row.count }));
  const payments = data.payment_statuses ?? [];
  const paymentTotal = payments.reduce((sum, row) => sum + row.count, 0);
  const completed = payments.find((row) => row.status === "completed")?.count ?? 0;
  const completedRate = paymentTotal > 0 ? Math.round((completed / paymentTotal) * 100) : 0;
  const progress = data.totals.avg_progress_pct ?? 0;
  const activity = [
    ...(data.recent_users ?? []).map((row) => ({
      id: `user-${row.id}`,
      name: row.name,
      text: "joined Multivate",
      at: row.created_at,
    })),
    ...(data.recent_enrollments ?? []).map((row, index) => ({
      id: `enroll-${index}-${row.created_at}`,
      name: row.user_name,
      text: `enrolled in ${row.course_title}`,
      at: row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);
  const latest = data.recent_users ?? [];

  const cards = [
    {
      label: "Accounts",
      value: String(data.totals.total_users),
      detail: roleCountLine(data.users_by_role) || "People on Multivate",
      href: "/admin/users",
      icon: Users,
      tint: "#10244F",
    },
    {
      label: "Courses",
      value: String(data.totals.total_courses),
      detail: "In the catalog",
      href: "/admin/courses",
      icon: BookOpen,
      tint: "#E8A317",
    },
    {
      label: "Enrollments",
      value: String(data.totals.total_enrollments),
      detail: `Average progress ${progress}%`,
      href: "/admin/enrollments",
      icon: UserCheck,
      tint: "#1F8A4C",
    },
    {
      label: "Revenue",
      value: formatMoneyCompact(data.totals.revenue_completed_cents),
      detail: pendingPayments > 0 ? `${pendingPayments} waiting` : "No payments waiting",
      href: "/admin/payments",
      icon: CreditCard,
      tint: "#7C5CDB",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="animate-fade-up">
          <h1 className="text-[1.75rem] font-semibold tracking-tight">
            {greeting()}, <span className="font-extrabold text-[#1457D0]">{firstName}</span>
          </h1>
          <p className="admin-muted mt-1 text-sm">Here&apos;s what is happening on Multivate.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="admin-card flex rounded-lg p-1">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  days === range ? "bg-[#1457D0] text-white" : "admin-muted hover:bg-[var(--admin-soft)]"
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={reload}
            className="admin-card inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[var(--admin-soft)]"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {notices.length > 0 ? (
        <div className="admin-alert flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
          <div>
            {notices.map((line) => (
              <p key={line} className="text-sm font-medium">
                {line}
              </p>
            ))}
          </div>
          <Link href={noticeHref} className="admin-card rounded-lg px-3 py-2 text-sm font-semibold dark:text-amber-200">
            Review
          </Link>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="admin-card admin-summary-card rounded-2xl px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(7,14,34,0.08)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: card.tint }}>
              <card.icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="admin-muted mt-4 text-xs font-medium">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{card.value}</p>
            <p className="admin-muted mt-2 text-xs">{card.detail}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.9fr)]">
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Growth</h2>
              <p className="admin-muted mt-1 text-xs">New accounts and enrollments, last {days} days</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#7C6BF2]" />
                Accounts
              </span>
              <span className="inline-flex items-center gap-2 text-[#2F9FE0]">
                <span className="h-2 w-2 rounded-full bg-[#2F9FE0]" />
                Enrollments
              </span>
            </div>
          </div>
          <GrowthLineChart users={users} enrollments={enrollments} hideLegend />
        </section>
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">Who is here</h2>
          <p className="admin-muted mt-1 text-xs">All accounts</p>
          <div className="mt-4">
            <DonutChart segments={roles} centerLabel={String(data.totals.total_users)} />
          </div>
        </section>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="admin-card rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold">Payments</h2>
            <CreditCard className="h-4 w-4 text-[#8b97ab]" aria-hidden />
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{completedRate}%</p>
          <p className="admin-muted text-xs">completed of recorded payments</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E7F1FC]">
            <div className="h-full rounded-full bg-[#1F8A4C]" style={{ width: `${completedRate}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {payments.map((row) => (
              <div key={row.status} className="rounded-xl bg-[var(--admin-soft)] px-2 py-2 text-center">
                <p className="admin-muted text-[11px]">{row.label}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">{row.count}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <h2 className="text-sm font-semibold">Learning progress</h2>
            <UserCheck className="h-4 w-4 text-[#8b97ab]" aria-hidden />
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{progress}%</p>
          <p className="admin-muted text-xs">average progress across enrollments</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E7F1FC]">
            <div className="h-full rounded-full bg-[#1457D0]" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="admin-muted">Enrollments</span>
            <span className="font-semibold tabular-nums">{data.totals.total_enrollments}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="admin-muted">Mentor applications waiting</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pendingMentors > 0 ? "bg-[#FFF4DE] text-[#A56B00]" : "bg-[#E5F6EC] text-[#1F8A4C]"}`}>
              {pendingMentors}
            </span>
          </div>
        </article>

        <article className="admin-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="admin-muted mt-6 text-sm">No recent activity yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <PersonMark name={item.name} className="h-8 w-8 text-[11px]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-semibold">{item.name}</span> <span className="admin-muted">{item.text}</span>
                    </p>
                    <p className="admin-muted text-xs">{timeAgo(item.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="admin-card overflow-hidden rounded-2xl">
        <div className="flex items-end justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Latest accounts</h2>
            <p className="admin-muted mt-1 text-xs">The most recent people on Multivate</p>
          </div>
          <Link href="/admin/users" className="text-sm font-semibold text-[#1457D0]">
            View all
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="admin-muted px-5 pb-6 text-sm">No accounts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="admin-muted border-y border-[var(--admin-line)] text-[11px] font-semibold uppercase tracking-[0.12em]">
                  <th className="px-5 py-2 font-semibold">Person</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-5 py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--admin-line)] last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PersonMark name={row.name} className="h-9 w-9 text-xs" />
                        <span className="font-semibold">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_PILL[row.role] ?? "bg-[#E7F1FC] text-[#1457D0]"}`}>
                        {ROLE_LABELS[row.role] ?? row.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_active ? "bg-[#E5F6EC] text-[#1F8A4C]" : "bg-[#FDECEC] text-[#C2414A]"}`}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="admin-muted px-3 py-3">{row.email}</td>
                    <td className="admin-muted px-5 py-3">{timeAgo(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(data.recent_payments ?? []).length > 0 ? (
        <section className="admin-card overflow-hidden rounded-2xl">
          <div className="flex items-end justify-between px-5 py-4">
            <h2 className="text-base font-semibold">Latest payments</h2>
            <Link href="/admin/payments" className="text-sm font-semibold text-[#1457D0]">
              View all
            </Link>
          </div>
          <ul>
            {data.recent_payments?.slice(0, 6).map((row) => (
              <li key={row.id} className="flex items-center gap-3 border-t border-[var(--admin-line)] px-5 py-3 text-sm">
                <PersonMark name={row.user_email} className="h-8 w-8 text-[11px]" />
                <span className="min-w-0 flex-1 truncate">{row.course_title || row.user_email}</span>
                <span className="font-semibold tabular-nums">{formatMoney(row.amount_cents, row.currency)}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_PILL[row.status] ?? "bg-[#E7F1FC] text-[#1457D0]"}`}>
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="admin-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-base font-semibold">Courses people join</h2>
          <Link href="/admin/courses" className="text-sm font-semibold text-[#1457D0]">
            Catalog
          </Link>
        </div>
        <CourseColumnChart courses={data.top_courses} />
      </section>
    </div>
  );
}
