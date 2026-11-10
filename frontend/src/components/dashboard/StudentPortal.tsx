"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { StudentPageHero, StudentSurface } from "@/components/dashboard/StudentPageHero";
import {
  DEFAULT_CAMPUS,
  asStudyMode,
  formatMoney,
  localDate,
  type StudentPortalRecord,
} from "@/lib/student-portal";

const GOALS = ["work", "study", "train", "live", "explore"] as const;
const CAMPUS_MAIL = "mailto:info@multivate.com.ng?subject=Campus%20Ibadan";

export function StudentPortal() {
  const t = useTranslations("dashboard.studentPortal");
  const [data, setData] = useState<StudentPortalRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  async function load() {
    const res = await fetch("/api/learning/portal", { credentials: "include", cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof body?.detail === "string" ? body.detail : t("loadError"));
      return;
    }
    setData(body as StudentPortalRecord);
    setError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function checkIn() {
    setCheckingIn(true);
    try {
      const res = await fetch("/api/learning/visit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ local_date: localDate() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.detail === "string" ? body.detail : t("checkInError"));
        return;
      }
      await load();
    } finally {
      setCheckingIn(false);
    }
  }

  if (!data) {
    return (
      <StudentSurface>
        <p className="text-sm text-[#011B33]/55">{error || t("loading")}</p>
      </StudentSurface>
    );
  }

  const mode = asStudyMode(data.study_mode);
  const onCampus = mode === "hybrid" || mode === "physical";
  const campus = data.campus_location || (onCampus ? DEFAULT_CAMPUS : null);
  const goal = GOALS.includes(data.goal_code as (typeof GOALS)[number]) ? data.goal_code : "explore";
  const practiceCourse =
    data.courses.find((row) => row.progress_pct > 0 && row.progress_pct < 100) ?? data.courses[0];
  const practiceHref = practiceCourse ? `/learn/${practiceCourse.slug}` : "/dashboard/courses";

  return (
    <>
      <StudentPageHero title={t("title")} subtitle={onCampus ? t("subtitleCampus") : t("subtitle")} />
      <StudentSurface>
        <div className="space-y-8">
          {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}

          <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">{t("identity")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-[#011B33]/50">{t("studentId")}</p>
                <p className="mt-1 font-mono text-lg font-extrabold">{data.student_code}</p>
                {onCampus ? <p className="mt-1 text-xs text-[#011B33]/50">{t("showIdHint")}</p> : null}
              </div>
              <div>
                <p className="text-xs text-[#011B33]/50">{t("name")}</p>
                <p className="mt-1 font-semibold">{data.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#011B33]/50">{t("email")}</p>
                <p className="mt-1 break-all text-sm font-semibold">{data.email}</p>
              </div>
              <div>
                <p className="text-xs text-[#011B33]/50">{t("programme")}</p>
                <p className="mt-1 font-semibold">{data.topic}</p>
                <p className="text-xs text-[#011B33]/50">
                  {t(`goal.${goal}`)} · {data.german_level}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">{t("modeTitle")}</p>
            <p className="mt-3 text-lg font-extrabold">{t(`modes.${mode}`)}</p>
            <p className="mt-1 text-sm text-[#011B33]/60">{t(`modeBody.${mode}`)}</p>
            {onCampus ? (
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#011B33]/50">{t("campus")}</dt>
                  <dd className="mt-1 font-semibold">{campus}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#011B33]/50">{t("cohort")}</dt>
                  <dd className="mt-1 font-semibold">{data.cohort_name || t("placementPending")}</dd>
                </div>
              </dl>
            ) : null}
          </section>

          {onCampus ? (
            <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">{t("todayTitle")}</p>
              <p className="mt-2 text-sm text-[#011B33]/60">{mode === "physical" ? t("todayPhysical") : t("todayHybrid")}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  disabled={checkingIn || Boolean(data.visited_today)}
                  onClick={() => void checkIn()}
                  className="rounded-[5px] border border-brand-ink/10 px-4 py-3 text-left disabled:opacity-60"
                >
                  <p className="text-sm font-extrabold">{data.visited_today ? t("checkedIn") : t("checkIn")}</p>
                  <p className="mt-1 text-xs text-[#011B33]/55">{t("checkInHint")}</p>
                </button>
                <Link href={practiceHref} className="rounded-[5px] border border-brand-ink/10 px-4 py-3">
                  <p className="text-sm font-extrabold">{mode === "physical" ? t("practiceAtHome") : t("practiceOnline")}</p>
                  <p className="mt-1 text-xs text-[#011B33]/55">{t("practiceHint")}</p>
                </Link>
                <Link href="/dashboard/payments" className="rounded-[5px] border border-brand-ink/10 px-4 py-3">
                  <p className="text-sm font-extrabold">{t("payFees")}</p>
                  <p className="mt-1 text-xs text-[#011B33]/55">
                    {data.outstanding_payments > 0 ? t("feesDue", { count: data.outstanding_payments }) : t("feesClear")}
                  </p>
                </Link>
                <Link href="/dashboard/book-1on1" className="rounded-[5px] border border-brand-ink/10 px-4 py-3">
                  <p className="text-sm font-extrabold">{t("bookMentor")}</p>
                  <p className="mt-1 text-xs text-[#011B33]/55">{t("bookMentorHint")}</p>
                </Link>
                <a href={CAMPUS_MAIL} className="rounded-[5px] border border-brand-ink/10 px-4 py-3">
                  <p className="text-sm font-extrabold">{t("emailCampus")}</p>
                  <p className="mt-1 text-xs text-[#011B33]/55">{t("emailCampusHint")}</p>
                </a>
                <Link href="/dashboard/support" className="rounded-[5px] border border-brand-ink/10 px-4 py-3">
                  <p className="text-sm font-extrabold">{t("help")}</p>
                  <p className="mt-1 text-xs text-[#011B33]/55">{t("helpHint")}</p>
                </Link>
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-extrabold">{t("thisWeek")}</h2>
                <Link href={practiceHref} className="text-sm font-semibold text-brand-accent">
                  {t("openClass")}
                </Link>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#011B33]/55">{onCampus ? t("campusDays") : t("daysOn")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {data.visits_this_week}/{data.visit_goal}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#011B33]/55">{mode === "online" ? t("onlineMinutes") : t("practiceMinutes")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {data.minutes_this_week}/{data.minutes_goal}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-extrabold">{t("fees")}</h2>
                <Link href="/dashboard/payments" className="text-sm font-semibold text-brand-accent">
                  {t("seePayments")}
                </Link>
              </div>
              <p className="mt-3 text-sm text-[#011B33]/60">
                {data.outstanding_payments > 0 ? t("feesDue", { count: data.outstanding_payments }) : t("feesClear")}
              </p>
              <ul className="mt-3 space-y-2">
                {data.payments.slice(0, 3).map((row) => (
                  <li key={`${row.payment_reference}-${row.status}`} className="flex justify-between text-sm">
                    <span className="truncate pr-3">{row.course_title || row.payment_reference || t("fees")}</span>
                    <span className="shrink-0 font-semibold">
                      {formatMoney(row.amount_cents, row.currency)} · {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rounded-[5px] border border-brand-ink/10 bg-white p-5">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-extrabold">{t("records")}</h2>
              <Link href="/dashboard/courses" className="text-sm font-semibold text-brand-accent">
                {t("allCourses")}
              </Link>
            </div>
            {data.courses.length === 0 ? (
              <p className="mt-3 text-sm text-[#011B33]/55">{t("noCourses")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-brand-ink/10">
                {data.courses.map((course) => (
                  <li key={course.slug} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{course.title}</p>
                      <p className="text-xs text-[#011B33]/50">
                        {course.status} · {course.progress_pct}%
                      </p>
                    </div>
                    <Link href={`/learn/${course.slug}`} className="shrink-0 text-sm font-semibold text-brand-accent">
                      {t("openClass")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </StudentSurface>
    </>
  );
}
