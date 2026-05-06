"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BarChart3, BookOpen, GraduationCap, TrendingUp, Users } from "lucide-react";
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

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

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
          setError("Session expired — sign in again.");
          return;
        }
        if (!res.ok) {
          setError(typeof body?.detail === "string" ? body.detail : "Could not load admin dashboard.");
          return;
        }
        setData(body as AdminDashboard);
        setError(null);
      } catch {
        if (!cancelled) setError("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Loading platform metrics…</p>
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="mx-auto max-w-[90rem] space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total users</p>
            <span className="rounded-full bg-violet-100 p-2 text-admin-indigo">
              <Users className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">{totals.total_users}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total enrollments</p>
            <span className="rounded-full bg-sky-100 p-2 text-sky-700">
              <GraduationCap className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">{totals.total_enrollments}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Catalog courses</p>
            <span className="rounded-full bg-emerald-100 p-2 text-emerald-800">
              <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">{totals.total_courses}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Revenue (completed)</p>
            <span className="rounded-full bg-orange-100 p-2 text-orange-700">
              <TrendingUp className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">
            {money(totals.revenue_completed_cents)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Pending payments</p>
            <span className="rounded-full bg-violet-100 p-2 text-admin-violet">
              <BarChart3 className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">{totals.payments_pending_count}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 xl:col-span-5">
          <h3 className="text-base font-extrabold tracking-tight text-brand-ink">Recent enrollments</h3>
          <p className="mt-1 text-xs text-slate-500">Latest activity from the database</p>
          <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
            {data.recent_enrollments.length === 0 ? (
              <li className="text-sm text-slate-600">No enrollments yet.</li>
            ) : (
              data.recent_enrollments.map((e) => (
                <li key={`${e.user_email}-${e.course_slug}-${e.created_at}`} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm">
                  <p className="font-semibold text-brand-ink">{e.course_title}</p>
                  <p className="text-xs text-slate-600">
                    {e.user_name} · {new Date(e.created_at).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 xl:col-span-4">
          <h3 className="text-base font-extrabold tracking-tight text-brand-ink">Top courses by enrollments</h3>
          <ul className="mt-4 space-y-3">
            {data.top_courses.length === 0 ? (
              <li className="text-sm text-slate-600">No courses in catalog.</li>
            ) : (
              data.top_courses.map((c) => (
                <li key={c.slug} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                    <Image src={c.image_url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-brand-ink">{c.title}</p>
                    <p className="text-xs text-slate-600">{c.enrollment_count} enrollments</p>
                  </div>
                  <Link href={`/courses/${c.slug}`} className="shrink-0 text-xs font-bold text-admin-indigo hover:underline">
                    View
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
          <h3 className="text-base font-extrabold tracking-tight text-brand-ink">Recent payments</h3>
          <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto text-sm">
            {data.recent_payments.length === 0 ? (
              <li className="text-slate-600">No payment records.</li>
            ) : (
              data.recent_payments.map((p) => (
                <li key={p.id} className="rounded-lg border border-slate-100 px-2 py-2">
                  <p className="font-semibold text-brand-ink">{money(p.amount_cents, p.currency)}</p>
                  <p className="text-xs text-slate-600">
                    {p.status} · {p.user_email}
                  </p>
                  {p.course_title ? <p className="text-xs text-slate-500">{p.course_title}</p> : null}
                </li>
              ))
            )}
          </ul>
          <Link href="/dashboard/admin/payments" className="mt-4 inline-block text-xs font-bold text-admin-indigo hover:underline">
            Open payments workspace
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold tracking-tight text-brand-ink">Recent users</h3>
          <Link href="/dashboard/admin/users" className="text-xs font-bold text-admin-indigo hover:underline">
            Manage users
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-2">User</th>
                <th className="pb-2 pr-2">Role</th>
                <th className="pb-2 pr-2">Joined</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recent_users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-2">
                    <p className="font-semibold text-brand-ink">{u.name}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="py-3 pr-2 text-xs font-bold capitalize text-slate-800">{u.role}</td>
                  <td className="py-3 pr-2 text-xs text-slate-600">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3 text-xs font-bold">{u.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
