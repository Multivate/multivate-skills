"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";

type UserRow = { id: string; name: string; email: string; role: string; is_active: boolean; created_at: string };
type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  user_email: string;
  course_slug: string | null;
  course_title: string | null;
};
type EnrollRow = {
  user_name: string;
  user_email: string;
  course_title: string;
  course_slug: string;
  created_at: string;
};
type CourseRow = { slug: string; title: string; description: string; image_url: string; lessons_count: number };

export function AdminSectionContent({ section }: { section: string }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollRow[] | null>(null);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [instructors, setInstructors] = useState<UserRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        if (section === "instructors") {
          const res = await fetch("/api/admin/users?limit=200", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "Failed to load users.");
            setInstructors([]);
            return;
          }
          const rows = Array.isArray(data) ? (data as UserRow[]) : [];
          setInstructors(rows.filter((u) => u.role === "instructor"));
          return;
        }
        if (section === "users") {
          const res = await fetch("/api/admin/users?limit=100", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "Failed to load users.");
            setUsers([]);
            return;
          }
          setUsers(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "payments") {
          const res = await fetch("/api/admin/payments?limit=100", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "Failed to load payments.");
            setPayments([]);
            return;
          }
          setPayments(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "enrollments") {
          const res = await fetch("/api/admin/enrollments?limit=200", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "Failed to load enrollments.");
            setEnrollments([]);
            return;
          }
          setEnrollments(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "courses") {
          const res = await fetch("/api/courses", { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr("Failed to load catalog.");
            setCourses([]);
            return;
          }
          setCourses(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setErr("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (section === "instructors") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (instructors === null) return <p className="text-sm text-slate-600">Loading instructors…</p>;
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {instructors.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold text-brand-ink">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(u.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {instructors.length === 0 ? <p className="p-4 text-sm text-slate-600">No instructor-role accounts yet.</p> : null}
      </div>
    );
  }

  if (section === "certificates" || section === "analytics" || section === "reviews" || section === "system-logs") {
    return (
      <NotConfiguredNotice title={section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
        <p>
          The Multivate API does not expose this workspace yet. There is no fabricated data — add a dedicated service
          when you are ready to ship this module.
        </p>
      </NotConfiguredNotice>
    );
  }

  if (section === "users") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (users === null) return <p className="text-sm text-slate-600">Loading users…</p>;
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold text-brand-ink">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(u.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-bold">{u.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section === "payments") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (payments === null) return <p className="text-sm text-slate-600">Loading payments…</p>;
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(p.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{p.user_email}</td>
                <td className="px-4 py-3 text-xs">{p.course_title ?? "—"}</td>
                <td className="px-4 py-3 font-semibold">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency }).format(p.amount_cents / 100)}
                </td>
                <td className="px-4 py-3 text-xs font-bold uppercase">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section === "enrollments") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (enrollments === null) return <p className="text-sm text-slate-600">Loading enrollments…</p>;
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Course</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrollments.map((e) => (
              <tr key={`${e.user_email}-${e.course_slug}-${e.created_at}`}>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(e.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-ink">{e.user_name}</p>
                  <p className="text-xs text-slate-500">{e.user_email}</p>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/courses/${e.course_slug}`} className="font-semibold text-admin-indigo hover:underline">
                    {e.course_title}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section === "courses") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (courses === null) return <p className="text-sm text-slate-600">Loading catalog…</p>;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => (
          <div key={c.slug} className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              <Image src={c.image_url} alt="" fill className="object-cover" sizes="112px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-brand-ink">{c.title}</p>
              <p className="line-clamp-2 text-xs text-slate-600">{c.description}</p>
              <p className="mt-1 text-xs text-slate-500">{c.lessons_count} lessons · {c.slug}</p>
              <Link href={`/courses/${c.slug}`} className="mt-2 inline-block text-xs font-bold text-admin-indigo hover:underline">
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <NotConfiguredNotice title="Admin">
      <p>Unknown section.</p>
    </NotConfiguredNotice>
  );
}
