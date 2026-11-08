"use client";

import { useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";

type Dash = {
  totals: { total_users: number; total_courses: number; total_enrollments: number };
  users_by_role?: { role: string; count: number }[];
};

const BAR_COLORS = ["#1457D0", "#7C5CDB", "#1F8A4C", "#E07A2F", "#0E8A8A", "#C43B7A"];

export function AdminDataManagement() {
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<{ label: string; value: number; note: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashRes, studentRes, instructorRes, pendingRes, paymentRes] = await Promise.all([
          fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/student-learning-profiles", { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/instructor-teaching-profiles", { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/courses/pending", { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/payments?limit=100", { credentials: "include", cache: "no-store" }),
        ]);
        const dash = (await dashRes.json().catch(() => null)) as Dash | null;
        const students = await studentRes.json().catch(() => null);
        const instructors = await instructorRes.json().catch(() => null);
        const pending = await pendingRes.json().catch(() => null);
        const payments = await paymentRes.json().catch(() => null);
        if (cancelled) return;
        if (!dashRes.ok || !dash?.totals) {
          setErr(readApiError(dash, "We couldn't load the records."));
          setRows([]);
          return;
        }
        const roleCount = (role: string) => dash.users_by_role?.find((item) => item.role === role)?.count ?? 0;
        const learningProfiles = Array.isArray(students) ? students.length : 0;
        const teachingProfiles = Array.isArray(instructors) ? instructors.length : 0;
        const waitingCourses = Array.isArray(pending) ? pending.length : 0;
        const paymentCount = Array.isArray(payments) ? payments.length : 0;
        setRows([
          { label: "Accounts", value: dash.totals.total_users, note: "People who can sign in" },
          { label: "Courses", value: dash.totals.total_courses, note: `${waitingCourses} waiting for review` },
          { label: "Enrollments", value: dash.totals.total_enrollments, note: "Course joins" },
          {
            label: "Learning profiles",
            value: learningProfiles,
            note: `${roleCount("student")} student account${roleCount("student") === 1 ? "" : "s"}`,
          },
          {
            label: "Teaching profiles",
            value: teachingProfiles,
            note: `${roleCount("instructor")} instructor account${roleCount("instructor") === 1 ? "" : "s"}`,
          },
          { label: "Payments", value: paymentCount, note: "Latest 100 records" },
        ]);
        setErr(null);
      } catch {
        if (!cancelled) setErr("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return <p className="text-sm text-red-700">{err}</p>;
  if (rows === null) return <p className="admin-muted text-sm">Loading records…</p>;

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-5">
      <section className="admin-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-base font-semibold">Records on file</h2>
        <p className="admin-muted mt-1 text-xs">How much is stored. Signups and course rankings stay on the overview.</p>
        <div className="mt-6 flex h-56 items-end gap-3">
          {rows.map((row, index) => {
            const height = row.value <= 0 ? 6 : Math.max(16, Math.round((row.value / max) * 100));
            return (
              <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold tabular-nums">{row.value}</span>
                <span className="flex h-36 w-full items-end justify-center">
                  <span
                    className="w-8 max-w-full rounded-t-md"
                    style={{ height: `${height}%`, background: BAR_COLORS[index % BAR_COLORS.length] }}
                  />
                </span>
                <span className="line-clamp-2 h-8 text-center text-[11px] leading-4 admin-muted">{row.label}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <article key={row.label} className="admin-card rounded-2xl px-4 py-3">
            <p className="text-sm font-semibold">{row.label}</p>
            <p className="admin-muted mt-1 text-xs">{row.note}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
