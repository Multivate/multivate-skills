"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";

type StudentRow = {
  user_id: string;
  user_name: string;
  user_email: string;
  course_slug: string;
  course_title: string;
  enrolled_at: string;
  lesson_done: number;
  progress_pct: number;
};

type InstructorDashboard = {
  totals: {
    total_courses: number;
    total_enrollments: number;
    unique_learners: number;
    revenue_completed_cents: number;
  };
  courses: { slug: string; title: string; image_url: string; lessons_count: number; enrollment_count: number }[];
};

type ReviewRow = {
  id: string;
  course_slug: string;
  course_title: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

function money(cents: number, currency = "NGN") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

function InstructorContentUpload() {
  const [dash, setDash] = useState<InstructorDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [courseSlug, setCourseSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/instructor/dashboard", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load your courses.");
          setDash(null);
          return;
        }
        setErr(null);
        const typed = data as InstructorDashboard;
        setDash(typed);
        const courses = typed.courses ?? [];
        if (courses.length) {
          setCourseSlug((prev) => (prev ? prev : courses[0].slug));
        }
      } catch {
        if (!cancelled) setErr("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setSaveMsg(null);
    if (!courseSlug.trim() || !title.trim()) {
      setSaveMsg("Choose a course and enter a lesson title.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseSlug)}/lessons`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          duration_minutes: Math.max(0, duration),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveMsg(typeof data?.detail === "string" ? data.detail : "We couldn't save the lesson. Try again.");
        return;
      }
      setSaveMsg("Lesson saved. It will show on the public course page.");
      setTitle("");
      setBody("");
      setDuration(0);
    } catch {
      setSaveMsg("Connection problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (err) return <p className="text-sm text-red-800">{err}</p>;
  if (!dash) return <p className="text-sm text-slate-600">Loading your courses…</p>;
  if (dash.courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
        <p className="text-sm leading-relaxed text-slate-600">
          Create a course first, then add lessons and media here.
        </p>
        <Link
          href="/dashboard/instructor/create-course"
          className="btn-primary-brand mt-5 inline-flex !no-underline"
        >
          Create course
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        Add structured lessons to a course you own. Each lesson appears in the public curriculum for that course.
      </p>
      <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800">
          Course
          <select
            value={courseSlug}
            onChange={(e) => setCourseSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          >
            {dash.courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title} ({c.slug})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Lesson title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Body (optional)
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Duration (minutes)
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
        {saveMsg ? <p className="text-sm text-slate-700">{saveMsg}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="btn-primary-brand w-full !py-3 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add lesson"}
        </button>
      </div>
    </div>
  );
}

export function InstructorSectionContent({ section }: { section: string }) {
  const tRel = useTranslations("dashboard.relationships");
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [dash, setDash] = useState<InstructorDashboard | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
  }, [section]);

  useEffect(() => {
    if (section !== "students") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/instructor/students?limit=200", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load students.");
          setStudents([]);
          return;
        }
        setStudents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setErr("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  useEffect(() => {
    if (!["analytics", "earnings"].includes(section)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/instructor/dashboard", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load your stats.");
          setDash(null);
          return;
        }
        setDash(data as InstructorDashboard);
      } catch {
        if (!cancelled) setErr("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  useEffect(() => {
    if (section !== "reviews") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reviews/instructor", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load reviews.");
          setReviews([]);
          return;
        }
        setErr(null);
        setReviews(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setErr("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (section === "create-course") {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-600">Course creation now lives in the full studio experience.</p>
        <Link href="/dashboard/instructor/studio/new" className="btn-primary-brand mt-4 inline-flex !min-w-0 text-sm">
          Open course studio
        </Link>
      </div>
    );
  }

  if (section === "content-upload") {
    return <InstructorContentUpload />;
  }

  if (section === "students") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (students === null) return <p className="text-sm text-slate-600">Loading enrollments…</p>;
    if (students.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-sm leading-relaxed text-slate-600">
            When students enroll in your courses, they will be listed here with enrollment date and contact details.
          </p>
          <Link href="/courses" className="mt-4 inline-block text-sm font-bold text-instructor-purple hover:underline">
            View public catalog
          </Link>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">{tRel("instructorRosterBlurb")}</p>
        <p>
          <Link href="/courses" className="text-sm font-bold text-instructor-purple hover:underline">
            {tRel("browseCatalogCta")}
          </Link>
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Enrolled</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Lessons done</th>
              <th className="px-4 py-3">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={`${s.user_id}-${s.course_slug}-${s.enrolled_at}`}>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(s.enrolled_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-ink">{s.user_name}</p>
                  <p className="text-xs text-slate-500">{s.user_email}</p>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/courses/${s.course_slug}`} className="font-semibold text-instructor-purple hover:underline">
                    {s.course_title}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{s.lesson_done ?? 0}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-brand-ink">{s.progress_pct ?? 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    );
  }

  if (section === "analytics") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (!dash) return <p className="text-sm text-slate-600">Loading analytics…</p>;
    const { totals, courses } = dash;
    return (
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your courses</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_courses}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total enrollments</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_enrollments}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Unique learners</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.unique_learners}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Completed revenue</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{money(totals.revenue_completed_cents)}</p>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Per-course enrollments</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <th className="pb-2 pr-4">Course</th>
                  <th className="pb-2 pr-4">Lessons</th>
                  <th className="pb-2">Enrollments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-600">
                      No courses yet.
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c.slug}>
                      <td className="py-3 pr-4 font-semibold text-brand-ink">{c.title}</td>
                      <td className="py-3 pr-4 tabular-nums text-slate-700">{c.lessons_count}</td>
                      <td className="py-3 tabular-nums text-slate-700">{c.enrollment_count}</td>
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

  if (section === "earnings") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (!dash) return <p className="text-sm text-slate-600">Loading earnings…</p>;
    return (
      <div className="space-y-6 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Completed course revenue</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-brand-ink">{money(dash.totals.revenue_completed_cents)}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Sum of completed payments tied to your published courses. For your own purchases and receipts, open Billing
            in the sidebar.
          </p>
        </div>
        <Link href="/dashboard/payments" className="inline-flex text-sm font-semibold text-instructor-purple hover:underline">
          Open billing and payments
        </Link>
      </div>
    );
  }

  if (section === "reviews") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (reviews === null) return <p className="text-sm text-slate-600">Loading reviews…</p>;
    if (reviews.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-sm leading-relaxed text-slate-600">
            Learners can leave a rating after they enroll. Share your courses and feedback will show up here.
          </p>
          <Link href="/dashboard/instructor/analytics" className="mt-4 inline-block text-sm font-bold text-instructor-purple hover:underline">
            View analytics
          </Link>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/courses/${r.course_slug}`} className="font-semibold text-instructor-purple hover:underline">
                    {r.course_title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-ink">{r.reviewer_name}</p>
                  <p className="text-xs text-slate-500">{r.reviewer_email}</p>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums text-brand-ink">{r.rating} / 5</td>
                <td className="max-w-xs px-4 py-3 text-slate-700">{r.comment ? r.comment : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <NotConfiguredNotice title="Instructor">Unknown section.</NotConfiguredNotice>;
}
