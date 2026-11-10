"use client";

import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  InstructorEnrollmentColumns,
  InstructorEnrollmentShare,
  InstructorLessonMix,
} from "@/components/dashboard/InstructorAnalyticsCharts";
import { InstructorKeyBoxes, instructorOverviewBoxes } from "@/components/dashboard/InstructorKeyBoxes";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";
import { useRealtimePoll } from "@/hooks/useRealtimePoll";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";

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

function PageIntro({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <header className="mb-8">
      <p className="text-sm text-[#011B33]/50">{kicker}</p>
      <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#011B33]/60">{body}</p>
    </header>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5 text-brand-accent" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "opacity-100" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function InstructorSectionContent({ section }: { section: string }) {
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

  if (section === "create-course" || section === "content-upload") {
    return (
      <div className="rounded-[5px] border border-brand-ink/10 bg-white px-6 py-14 text-center shadow-[0_8px_24px_rgba(16,36,79,0.04)]">
        <p className="text-lg font-extrabold">Course studio</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#011B33]/60">
          Create courses, covers, and lessons in one place.
        </p>
        <Link
          href={section === "create-course" ? "/instructor/studio/new" : "/instructor/studio"}
          className="mt-6 inline-flex h-11 items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white hover:bg-[#0f4bb8]"
        >
          Open studio
        </Link>
      </div>
    );
  }

  if (section === "students") {
    if (err) return <p className="text-sm text-red-700">{err}</p>;
    if (students === null) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-brand-ink/10" />
          <div className="h-40 rounded-[5px] bg-brand-ink/10" />
        </div>
      );
    }
    return (
      <div>
        <PageIntro
          kicker="Audience"
          title="Students"
          body="People enrolled in courses you instruct, with the progress they have actually completed."
        />
        {students.length === 0 ? (
          <div className="rounded-[5px] border border-dashed border-brand-ink/20 px-6 py-12 text-center">
            <p className="font-semibold">No enrollments yet</p>
            <p className="mt-1 text-sm text-[#011B33]/55">They appear here after a student joins one of your courses.</p>
            <Link href="/instructor/studio" className="mt-5 inline-block text-sm font-semibold text-brand-accent hover:underline">
              Open studio
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-brand-ink/10 overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white">
            {students.map((row) => (
              <li key={`${row.user_id}-${row.course_slug}-${row.enrolled_at}`} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                <PersonMark name={row.user_name} className="h-11 w-11 text-[12px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{row.user_name}</p>
                  <p className="truncate text-xs text-[#011B33]/50">{row.user_email}</p>
                  <Link href={`/courses/${row.course_slug}`} className="mt-1 inline-block text-sm font-semibold text-brand-accent hover:underline">
                    {row.course_title}
                  </Link>
                </div>
                <div className="w-full sm:w-48">
                  <div className="flex justify-between text-xs text-[#011B33]/50">
                    <span>{row.lesson_done} lessons done</span>
                    <span className="font-semibold tabular-nums text-[#011B33]">{row.progress_pct ?? 0}%</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-ink/10">
                    <div className="h-full bg-brand-accent" style={{ width: `${Math.min(100, row.progress_pct ?? 0)}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#011B33]/40">{new Date(row.enrolled_at).toLocaleDateString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (section === "analytics") {
    if (err) return <p className="text-sm text-red-700">{err}</p>;
    if (!dash) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-brand-ink/10" />
          <div className="h-28 rounded-[5px] bg-brand-ink/10" />
        </div>
      );
    }
    const { totals, courses } = dash;
    return (
      <div>
        <PageIntro kicker="Insights" title="Analytics" body="Enrollment and learner activity across the courses you instruct." />
        <InstructorKeyBoxes items={instructorOverviewBoxes(totals)} />
        {courses.length === 0 ? (
          <p className="mt-8 rounded-[5px] border border-dashed border-brand-ink/20 px-4 py-8 text-center text-sm text-[#011B33]/55">No courses yet.</p>
        ) : (
          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5 shadow-[0_10px_30px_rgba(16,36,79,0.05)] sm:p-6">
              <h2 className="text-lg font-extrabold">Enrollments by course</h2>
              <p className="mt-1 text-sm text-[#011B33]/55">How many learners joined each course you instruct.</p>
              <div className="mt-5">
                <InstructorEnrollmentColumns courses={courses} />
              </div>
            </section>
            <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5 shadow-[0_10px_30px_rgba(16,36,79,0.05)] sm:p-6">
              <h2 className="text-lg font-extrabold">Share of enrollments</h2>
              <p className="mt-1 text-sm text-[#011B33]/55">Which course holds the most of your audience.</p>
              <div className="mt-5">
                <InstructorEnrollmentShare courses={courses} />
              </div>
            </section>
            <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5 shadow-[0_10px_30px_rgba(16,36,79,0.05)] xl:col-span-2 sm:p-6">
              <h2 className="text-lg font-extrabold">Lessons and enrollments</h2>
              <p className="mt-1 text-sm text-[#011B33]/55">Navy is lesson count. Blue is enrollments. Same scale, real numbers.</p>
              <div className="mt-5">
                <InstructorLessonMix courses={courses} />
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  if (section === "earnings") {
    if (err) return <p className="text-sm text-red-700">{err}</p>;
    if (!dash) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-brand-ink/10" />
          <div className="h-40 rounded-[5px] bg-brand-ink/10" />
        </div>
      );
    }
    return (
      <div>
        <PageIntro kicker="Insights" title="Earnings" body="Completed payment volume from your courses." />
        <section className="overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white">
          <div className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.8fr)]">
            <div className="p-7 sm:p-9">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">Completed course revenue</p>
              <p className="mt-4 text-4xl font-extrabold tabular-nums tracking-tight" title={formatMoney(dash.totals.revenue_completed_cents)}>
                {formatMoneyCompact(dash.totals.revenue_completed_cents)}
              </p>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#011B33]/60">
                Paid earnings from students who completed checkout on your courses. Purchases you make as a learner are in Billing.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/payments"
                  className="inline-flex h-10 items-center rounded-[5px] bg-brand-accent px-4 text-sm font-semibold text-white hover:bg-[#0f4bb8]"
                >
                  Open billing
                </Link>
                <Link
                  href="/instructor/analytics"
                  className="inline-flex h-10 items-center rounded-[5px] border border-brand-ink/15 px-4 text-sm font-semibold hover:border-brand-accent hover:text-brand-accent"
                >
                  View analytics
                </Link>
              </div>
            </div>
            <aside className="border-t border-brand-ink/10 bg-brand-sky/70 p-7 dark:bg-[#1457D0]/15 md:border-l md:border-t-0 sm:p-9">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">Snapshot</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#011B33]/55">Courses</dt>
                  <dd className="font-semibold tabular-nums">{dash.totals.total_courses}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#011B33]/55">Enrollments</dt>
                  <dd className="font-semibold tabular-nums">{dash.totals.total_enrollments}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#011B33]/55">Learners</dt>
                  <dd className="font-semibold tabular-nums">{dash.totals.unique_learners}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  if (section === "reviews") {
    if (err) return <p className="text-sm text-red-700">{err}</p>;
    if (reviews === null) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-brand-ink/10" />
          <div className="h-40 rounded-[5px] bg-brand-ink/10" />
        </div>
      );
    }
    return (
      <div>
        <PageIntro kicker="Audience" title="Reviews" body="Ratings and comments students left on courses you instruct." />
        {reviews.length === 0 ? (
          <div className="rounded-[5px] border border-dashed border-brand-ink/20 px-6 py-12 text-center">
            <p className="font-semibold">No reviews yet</p>
            <p className="mt-1 text-sm text-[#011B33]/55">They appear here after a student rates one of your courses.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((row) => (
              <li key={row.id} className="rounded-[5px] border border-brand-ink/10 bg-white p-5">
                <div className="flex items-start gap-3">
                  <PersonMark name={row.reviewer_name} className="h-10 w-10 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{row.reviewer_name}</p>
                      <Stars rating={row.rating} />
                    </div>
                    <p className="mt-0.5 text-xs text-[#011B33]/45">
                      {new Date(row.created_at).toLocaleDateString()} ·{" "}
                      <Link href={`/courses/${row.course_slug}`} className="font-semibold text-brand-accent hover:underline">
                        {row.course_title}
                      </Link>
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-[#011B33]/75">{row.comment || "No written comment."}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return <NotConfiguredNotice title="Instructor">Unknown section.</NotConfiguredNotice>;
}
