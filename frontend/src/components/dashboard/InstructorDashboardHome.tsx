"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { BookOpen, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

type InstructorDashboard = {
  totals: {
    total_courses: number;
    total_enrollments: number;
    unique_learners: number;
    revenue_completed_cents: number;
  };
  courses: { slug: string; title: string; image_url: string; lessons_count: number; enrollment_count: number }[];
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

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
          setError("You do not have access to the instructor workspace.");
          return;
        }
        if (!res.ok) {
          setError(typeof body?.detail === "string" ? body.detail : "Could not load instructor dashboard.");
          return;
        }
        setData(body as InstructorDashboard);
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
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Loading teaching workspace…</p>
      </div>
    );
  }

  const { totals, courses } = data;

  return (
    <div className="mx-auto max-w-[90rem] space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your courses</p>
            <span className="rounded-lg bg-slate-100 p-2 text-instructor-purple">
              <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">{totals.total_courses}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total enrollments</p>
            <span className="rounded-lg bg-slate-100 p-2 text-instructor-purple">
              <Users className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">{totals.total_enrollments}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Unique learners</p>
            <span className="rounded-lg bg-slate-100 p-2 text-instructor-purple">
              <Users className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">{totals.unique_learners}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Completed revenue</p>
            <span className="rounded-lg bg-slate-100 p-2 text-instructor-purple">
              <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-ink">
            {money(totals.revenue_completed_cents)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-extrabold tracking-tight text-brand-ink">Courses you instruct</h3>
          <Link
            href="/dashboard/instructor/create-course"
            className="text-sm font-semibold text-instructor-purple hover:underline"
          >
            Create course
          </Link>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4">Course</th>
                <th className="pb-3 pr-4">Lessons</th>
                <th className="pb-3 pr-4">Enrollments</th>
                <th className="pb-3"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-600">
                    No courses assigned to you yet. Create one to publish under your instructor account.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.slug} className="align-middle">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          <Image src={c.image_url} alt="" fill className="object-cover" sizes="80px" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-brand-ink">{c.title}</p>
                          <p className="text-xs text-slate-500">{c.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 font-semibold tabular-nums text-slate-800">{c.lessons_count}</td>
                    <td className="py-4 pr-4 font-semibold tabular-nums text-slate-800">{c.enrollment_count}</td>
                    <td className="py-4">
                      <Link href={`/courses/${c.slug}`} className="text-sm font-semibold text-instructor-purple hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
