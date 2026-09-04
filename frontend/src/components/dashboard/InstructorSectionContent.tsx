"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";
import { DashboardLiveBadge } from "@/components/dashboard/DashboardLiveBadge";
import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";
import { useRealtimePoll } from "@/hooks/useRealtimePoll";

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
      <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-700 /50">
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
      <div className="space-y-4 rounded-md border border-slate-200/90 bg-white  p-6 shadow-none">
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
  const [dashUpdatedAt, setDashUpdatedAt] = useState<Date | null>(null);
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

  const loadDash = useCallback(async () => {
    try {
      const res = await fetch("/api/instructor/dashboard", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load your stats.");
        setDash(null);
        return;
      }
      setDash(data as InstructorDashboard);
      setDashUpdatedAt(new Date());
      setErr(null);
    } catch {
      setErr("Connection problem. Please try again.");
    }
  }, []);

  useRealtimePoll(["analytics", "earnings"].includes(section), loadDash);

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
      <div className="rounded-md border border-slate-200/90 bg-white p-8 text-center shadow-none">
        <p className="text-sm text-slate-600">Course creation now lives in the full studio experience.</p>
        <Link href="/dashboard/instructor/studio/new" className="btn-primary-brand mt-4 inline-flex !min-w-0 text-sm">
          Open course studio
        </Link>
      </div>
    );
  }

  if (section === "content-upload") {
    return (
      <div className="rounded-md border border-slate-200/90 bg-white p-8 text-center shadow-none dark:border-slate-800 ">
        <p className="text-sm leading-relaxed text-slate-600">
          Add lessons and videos in Course Studio: upload a file or paste a YouTube, Vimeo, or video link. Students watch inside the app.
        </p>
        <Link href="/dashboard/instructor/studio" className="btn-primary-brand mt-5 inline-flex !min-w-0 text-sm !no-underline">
          Open course studio
        </Link>
      </div>
    );
  }

  if (section === "students") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (students === null) return <p className="text-sm text-slate-600">Loading enrollments…</p>;
    if (students.length === 0) {
      return (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 /50">
          <p className="text-sm leading-relaxed text-slate-600">
            When students enroll in your courses, they will be listed here with enrollment date and contact details.
          </p>
          <Link href="/courses" className="mt-4 inline-block text-sm font-bold text-brand-accent hover:underline">
            View public catalog
          </Link>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">{tRel("instructorRosterBlurb")}</p>
        <p>
          <Link href="/courses" className="text-sm font-bold text-brand-accent hover:underline">
            {tRel("browseCatalogCta")}
          </Link>
        </p>
        <div className="overflow-x-auto rounded-md border border-slate-200/90 bg-white  shadow-none">
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
                  <Link href={`/courses/${s.course_slug}`} className="font-semibold text-brand-accent hover:underline">
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
    if (!dash) return <p className="text-sm text-brand-ink/60">Loading analytics…</p>;
    const { totals, courses } = dash;
    return (
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-ink/10 pb-6">
          <div>
            <p className="tag-overline">Instructor</p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-ink">Analytics</h1>
            <p className="mt-2 text-sm text-brand-ink/60">Enrollment and learner activity across your courses.</p>
          </div>
          <DashboardLiveBadge lastUpdated={dashUpdatedAt} />
        </header>

        <section className="grid grid-cols-1 gap-px overflow-hidden border border-brand-ink/10 bg-brand-ink/10 sm:grid-cols-3">
          <div className="bg-white px-5 py-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">Courses</p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums text-brand-ink">{totals.total_courses}</p>
          </div>
          <div className="bg-white px-5 py-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">Enrollments</p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums text-brand-ink">{totals.total_enrollments}</p>
          </div>
          <div className="bg-white px-5 py-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">Unique learners</p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums text-brand-ink">{totals.unique_learners}</p>
          </div>
        </section>

        <p className="text-sm text-brand-ink/55">
          Revenue lives on{" "}
          <Link href="/dashboard/instructor/earnings" className="font-semibold text-brand-accent hover:text-brand-accent-dark">
            Earnings
          </Link>
          .
        </p>

        <section className="border border-brand-ink/10 bg-white">
          <div className="border-b border-brand-ink/10 px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg font-semibold text-brand-ink">Per-course enrollments</h2>
            <p className="mt-1 text-sm text-brand-ink/55">How each course is performing</p>
          </div>
          <div className="overflow-x-auto px-5 py-2 sm:px-6">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-ink/10 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">
                  <th className="py-3 pr-4">Course</th>
                  <th className="py-3 pr-4">Lessons</th>
                  <th className="py-3">Enrollments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/10">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-brand-ink/55">
                      No courses yet.
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c.slug}>
                      <td className="py-3.5 pr-4 font-semibold text-brand-ink">{c.title}</td>
                      <td className="py-3.5 pr-4 tabular-nums text-brand-ink/70">{c.lessons_count}</td>
                      <td className="py-3.5 tabular-nums text-brand-ink/70">{c.enrollment_count}</td>
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
    if (!dash) return <p className="text-sm text-brand-ink/60">Loading earnings…</p>;
    return (
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-ink/10 pb-6">
          <div>
            <p className="tag-overline">Instructor</p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-brand-ink">Earnings</h1>
            <p className="mt-2 text-sm text-brand-ink/60">Completed payment volume from your courses.</p>
          </div>
          <DashboardLiveBadge lastUpdated={dashUpdatedAt} />
        </header>

        <section className="border border-brand-ink/10 bg-white px-5 py-8 sm:px-8">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">
            Completed course revenue
          </p>
          <p
            className="mt-4 font-display text-4xl font-bold tabular-nums tracking-tight text-brand-ink"
            title={formatMoney(dash.totals.revenue_completed_cents)}
          >
            {formatMoneyCompact(dash.totals.revenue_completed_cents)}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-ink/60">
            Sum of completed payments tied to courses you instruct. For your personal purchases and receipts, open
            Billing.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/dashboard/payments" className="text-sm font-semibold text-brand-accent hover:text-brand-accent-dark">
              Open billing
            </Link>
            <Link href="/dashboard/instructor/analytics" className="text-sm font-semibold text-brand-ink/55 hover:text-brand-ink">
              View enrollment analytics
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (section === "reviews") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (reviews === null) return <p className="text-sm text-slate-600">Loading reviews…</p>;
    if (reviews.length === 0) {
      return (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 /50">
          <p className="text-sm leading-relaxed text-slate-600">
            Learners can leave a rating after they enroll. Share your courses and feedback will show up here.
          </p>
          <Link href="/dashboard/instructor/analytics" className="mt-4 inline-block text-sm font-bold text-brand-accent hover:underline">
            View analytics
          </Link>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-md border border-slate-200/90 bg-white  shadow-none">
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
                  <Link href={`/courses/${r.course_slug}`} className="font-semibold text-brand-accent hover:underline">
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
