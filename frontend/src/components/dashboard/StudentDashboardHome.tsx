"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { CatalogCourseCard } from "@/components/courses/CatalogCourseCard";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { StudentEnrolledCard, type EnrolledCourse } from "@/components/dashboard/StudentEnrolledCard";
import { StudentSurface } from "@/components/dashboard/StudentPageHero";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/navigation";
import type { BackendCourse } from "@/lib/backend-courses";
import { asStudyMode, formatMoney, type StudentPortalRecord, type StudyMode } from "@/lib/student-portal";

type PathStep = {
  order: number;
  track: string;
  role: "now" | "next" | "later" | string;
  reason: string;
  course: BackendCourse;
};

type LearningPath = {
  goal_code: string;
  topic: string;
  german_level: string;
  session_minutes: number;
  week_days: number;
  week_minutes: number;
  summary: string;
  has_catalog: boolean;
  steps: PathStep[];
};

type Habits = {
  streak_weeks: number;
  visits_this_week: number;
  visit_goal: number;
  minutes_this_week: number;
  minutes_goal: number;
};

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function greetingFor(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function Meter({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold text-[#011B33]/55">{label}</p>
        <p className="text-xs tabular-nums text-[#011B33]/70">
          {value}/{goal} {unit}
        </p>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-ink/10">
        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ModeAside({
  mode,
  portal,
  habits,
}: {
  mode: StudyMode;
  portal: StudentPortalRecord | null;
  habits: Habits | null;
}) {
  const t = useTranslations("dashboard.studentHome");
  const tPortal = useTranslations("dashboard.studentPortal");
  const tNav = useTranslations("dashboard.nav.student");

  if (mode === "physical") {
    return (
      <aside className="flex flex-col justify-between rounded-[5px] border border-brand-ink/10 bg-[#f6f8fb] p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">{t("campusDesk")}</p>
          <p className="mt-3 font-semibold">{portal?.campus_location || t("placementPending")}</p>
          <p className="mt-1 text-sm text-[#011B33]/60">{portal?.cohort_name || t("cohortPending")}</p>
          <p className="mt-4 font-mono text-sm font-bold">{portal?.student_code}</p>
          <p className="mt-4 text-sm text-[#011B33]/60">{t("timetableBody")}</p>
          {habits ? (
            <div className="mt-4">
              <Meter label={t("campusDays")} value={habits.visits_this_week} goal={habits.visit_goal} unit={t("visitsUnit")} />
            </div>
          ) : null}
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          <li>
            <Link href="/dashboard/portal" className="text-brand-accent hover:underline">
              {tNav("portal")}
            </Link>
          </li>
          <li>
            <Link href="/dashboard/payments" className="text-[#011B33]/70 hover:text-brand-accent">
              {tPortal("fees")}
            </Link>
          </li>
        </ul>
      </aside>
    );
  }

  if (mode === "hybrid") {
    return (
      <aside className="flex flex-col justify-between rounded-[5px] border border-brand-ink/10 bg-[#f6f8fb] p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">{t("hybridDesk")}</p>
          <p className="mt-3 text-sm font-semibold">{portal?.campus_location || t("placementPending")}</p>
          <p className="mt-1 text-sm text-[#011B33]/60">{portal?.cohort_name || t("cohortPending")}</p>
          {habits ? (
            <div className="mt-4 space-y-4">
              <Meter label={t("campusDays")} value={habits.visits_this_week} goal={habits.visit_goal} unit={t("visitsUnit")} />
              <Meter label={t("practiceMinutes")} value={habits.minutes_this_week} goal={habits.minutes_goal} unit={t("minutesUnit")} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#011B33]/55">{t("weekPending")}</p>
          )}
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          <li>
            <Link href="/dashboard/portal" className="text-brand-accent hover:underline">
              {tNav("portal")}
            </Link>
          </li>
          <li>
            <Link href="/dashboard/payments" className="text-[#011B33]/70 hover:text-brand-accent">
              {tPortal("fees")}
            </Link>
          </li>
          <li>
            <Link href="/dashboard/book-1on1" className="text-[#011B33]/70 hover:text-brand-accent">
              {tNav("bookOneOnOne")}
            </Link>
          </li>
        </ul>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col justify-between rounded-[5px] border border-brand-ink/10 bg-[#f6f8fb] p-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">{t("thisWeek")}</p>
        {habits ? (
          <div className="mt-4 space-y-4">
            <Meter label={t("visitsLabel")} value={habits.visits_this_week} goal={habits.visit_goal} unit={t("visitsUnit")} />
            <Meter label={t("minutesLabel")} value={habits.minutes_this_week} goal={habits.minutes_goal} unit={t("minutesUnit")} />
            {habits.streak_weeks > 0 ? <p className="text-sm font-semibold">{t("streak", { count: habits.streak_weeks })}</p> : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#011B33]/55">{t("weekPending")}</p>
        )}
      </div>
      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
        <li>
          <Link href="/dashboard/portal" className="text-brand-accent hover:underline">
            {tNav("portal")}
          </Link>
        </li>
        <li>
          <Link href="/dashboard/courses" className="text-[#011B33]/70 hover:text-brand-accent">
            {tNav("myCourses")}
          </Link>
        </li>
        <li>
          <Link href="/dashboard/book-1on1" className="text-[#011B33]/70 hover:text-brand-accent">
            {tNav("bookOneOnOne")}
          </Link>
        </li>
      </ul>
    </aside>
  );
}

export function StudentDashboardHome() {
  const { user } = useAuth();
  const t = useTranslations("dashboard.studentHome");
  const tRec = useTranslations("dashboard.recommendations");
  const tPortal = useTranslations("dashboard.studentPortal");
  const [items, setItems] = useState<EnrolledCourse[] | null>(null);
  const [catalog, setCatalog] = useState<BackendCourse[]>([]);
  const [path, setPath] = useState<LearningPath | null>(null);
  const [habits, setHabits] = useState<Habits | null>(null);
  const [portal, setPortal] = useState<StudentPortalRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localDate();
    (async () => {
      try {
        const [coursesRes, pathRes, catalogRes, visitRes, portalRes] = await Promise.all([
          fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" }),
          fetch("/api/learning/path", { credentials: "include", cache: "no-store" }),
          fetch("/api/courses", { cache: "no-store" }),
          fetch("/api/learning/visit", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ local_date: today }),
          }),
          fetch("/api/learning/portal", { credentials: "include", cache: "no-store" }),
        ]);
        const coursesData = await coursesRes.json().catch(() => null);
        const pathData = await pathRes.json().catch(() => null);
        const catalogData = await catalogRes.json().catch(() => null);
        const visitData = await visitRes.json().catch(() => null);
        const portalData = await portalRes.json().catch(() => null);
        if (cancelled) return;
        if (coursesRes.status === 401) {
          setError("Your session expired. Please sign in again.");
          setItems([]);
          return;
        }
        if (!coursesRes.ok) {
          setError(typeof coursesData?.detail === "string" ? coursesData.detail : "We couldn't load your courses.");
          setItems([]);
          return;
        }
        setError(null);
        setItems(Array.isArray(coursesData) ? (coursesData as EnrolledCourse[]) : []);
        setPath(pathRes.ok && pathData && Array.isArray(pathData.steps) ? (pathData as LearningPath) : null);
        setCatalog(catalogRes.ok && Array.isArray(catalogData) ? (catalogData as BackendCourse[]) : []);
        if (visitRes.ok && visitData && typeof visitData.visits_this_week === "number") {
          setHabits(visitData as Habits);
        }
        if (portalRes.ok && portalData?.student_code) {
          setPortal(portalData as StudentPortalRecord);
        }
      } catch {
        if (!cancelled) {
          setError("Connection problem. Please try again.");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nextForYou = useMemo(() => {
    const enrolled = new Set((items ?? []).map((row) => row.slug));
    const fromPath = (path?.steps ?? [])
      .map((step) => step.course)
      .filter((course) => course?.slug && !enrolled.has(course.slug));
    if (fromPath.length > 0) return fromPath.slice(0, 4);
    return catalog.filter((course) => course?.slug && !enrolled.has(course.slug)).slice(0, 4);
  }, [catalog, items, path]);

  const pathSteps = useMemo(() => {
    const enrolled = new Set((items ?? []).map((row) => row.slug));
    const fromPath = (path?.steps ?? []).filter((step) => step.course?.slug && !enrolled.has(step.course.slug));
    if (fromPath.length > 0) return fromPath.slice(0, 4);
    return nextForYou.map((course, index) => ({
      order: index + 1,
      track: "",
      role: index === 0 ? "now" : "later",
      reason: "",
      course,
    }));
  }, [items, path, nextForYou]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const continueCourse =
    (items ?? []).find((row) => row.progress_pct > 0 && row.progress_pct < 100) ?? (items ?? [])[0] ?? null;
  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const mode = asStudyMode(portal?.study_mode);

  if (items === null) {
    return (
      <StudentSurface>
        <div className="min-h-[70vh] animate-pulse space-y-8">
          <div className="h-8 w-64 rounded bg-brand-ink/10" />
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.55fr)_minmax(15rem,0.72fr)]">
            <div className="h-44 rounded-[5px] bg-brand-ink/10" />
            <div className="h-44 rounded-[5px] bg-brand-ink/10" />
          </div>
          <div className="h-28 rounded-[5px] bg-brand-ink/10" />
        </div>
      </StudentSurface>
    );
  }

  if (error) {
    return (
      <StudentSurface>
        <p className="text-sm">{error}</p>
        <Link href="/login" className="mt-3 inline-block text-sm font-semibold text-brand-accent">
          Sign in
        </Link>
      </StudentSurface>
    );
  }

  const weekLine =
    continueCourse?.current_week_title && (continueCourse.current_week_lessons ?? 0) > 0
      ? `${continueCourse.current_week_title} · ${continueCourse.current_week_done ?? 0} of ${continueCourse.current_week_lessons} this week`
      : continueCourse
        ? `${continueCourse.lesson_done} of ${continueCourse.lessons} items · ${continueCourse.progress_pct}%`
        : "";

  const continueLabel =
    mode === "physical" ? t("practice") : continueCourse && continueCourse.progress_pct > 0 ? t("continue") : t("start");
  const continueKicker =
    mode === "physical" ? t("practiceKicker") : continueCourse && continueCourse.progress_pct > 0 ? t("pickUp") : t("startHere");

  const feeLine =
    portal && portal.outstanding_payments > 0
      ? tPortal("feesDue", { count: portal.outstanding_payments })
      : portal?.payments[0]
        ? `${formatMoney(portal.payments[0].amount_cents, portal.payments[0].currency)} · ${portal.payments[0].status}`
        : tPortal("feesClear");

  return (
    <StudentSurface>
      <div className="space-y-12">
        <header>
          <p className="text-sm text-[#011B33]/50">
            {weekday} · {t(`modeBadge.${mode}`)}
            {portal?.student_code ? ` · ${portal.student_code}` : ""}
          </p>
          <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight text-[#011B33] sm:text-[2rem]">
            {greetingFor(firstName)}
          </h1>
        </header>

        {mode !== "online" && portal?.outstanding_payments ? (
          <p className="rounded-[5px] border border-brand-ink/10 bg-white px-4 py-3 text-sm">
            {feeLine}{" "}
            <Link href="/dashboard/payments" className="font-semibold text-brand-accent">
              {tPortal("seePayments")}
            </Link>
          </p>
        ) : null}

        {continueCourse ? (
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.55fr)_minmax(15rem,0.72fr)] md:items-stretch">
            <div className="rounded-[5px] border border-brand-ink/10 bg-white">
              <div className="flex flex-col sm:flex-row">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-[5px] bg-[#f4f6fb] sm:aspect-auto sm:w-[13.5rem] sm:min-h-[12rem] sm:rounded-l-[5px] sm:rounded-tr-none">
                  <CourseThumbnail src={continueCourse.image_url} alt={continueCourse.title} sizes="280px" className="object-cover" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">{continueKicker}</p>
                  <h2 className="mt-1 text-lg font-extrabold leading-snug sm:text-xl">{continueCourse.title}</h2>
                  <p className="mt-2 text-sm text-[#011B33]/60">{weekLine}</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-brand-ink/10">
                    <div className="h-full bg-brand-accent" style={{ width: `${Math.min(100, continueCourse.progress_pct)}%` }} />
                  </div>
                  <Link
                    href={`/learn/${continueCourse.slug}`}
                    className="mt-5 inline-flex h-10 w-fit items-center rounded-[5px] bg-brand-accent px-4 text-sm font-semibold text-white"
                  >
                    {continueLabel}
                  </Link>
                </div>
              </div>
            </div>
            <ModeAside mode={mode} portal={portal} habits={habits} />
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-[minmax(0,1.55fr)_minmax(15rem,0.72fr)] md:items-stretch">
            {pathSteps[0] ? (
              <div className="rounded-[5px] border border-brand-ink/10 bg-white p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">{tRec("now")}</p>
                <h2 className="mt-1 text-lg font-extrabold sm:text-xl">{pathSteps[0].course.title}</h2>
                <p className="mt-2 text-sm text-[#011B33]/60">{path?.summary ?? tRec("subtitle")}</p>
                <Link
                  href={`/courses/${pathSteps[0].course.slug}`}
                  className="mt-5 inline-flex h-10 w-fit items-center rounded-[5px] bg-brand-accent px-4 text-sm font-semibold text-white"
                >
                  {tRec("openFirst")}
                </Link>
              </div>
            ) : (
              <div className="rounded-[5px] border border-dashed border-brand-ink/20 px-6 py-12 text-center">
                <p className="font-semibold">{tRec("emptyEnrollTitle")}</p>
                <p className="mt-2 text-sm text-[#011B33]/60">{path?.summary || tRec("emptyEnrollBody")}</p>
                <Link href="/courses" className="mt-5 inline-flex h-11 items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white">
                  {tRec("browse")}
                </Link>
              </div>
            )}
            <ModeAside mode={mode} portal={portal} habits={habits} />
          </section>
        )}

        {items.length > 0 ? (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-extrabold">{t("library")}</h2>
              <Link href="/dashboard/courses" className="text-sm font-semibold text-brand-accent hover:underline">
                {t("seeAll")}
              </Link>
            </div>
            <div className="divide-y divide-brand-ink/10 rounded-[5px] border border-brand-ink/10 px-3 py-1">
              {items.map((course) => (
                <StudentEnrolledCard key={course.slug} course={course} layout="row" />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">{tRec("title")}</h2>
              <p className="mt-1 text-sm text-[#011B33]/60">{path?.summary || tRec("subtitle")}</p>
              {path ? (
                <p className="mt-1 text-xs text-[#011B33]/45">
                  {tRec("weekly", { minutes: path.week_minutes, days: path.week_days })}
                </p>
              ) : null}
            </div>
            <Link href="/courses" className="text-sm font-semibold text-brand-accent hover:underline">
              {tRec("browse")}
            </Link>
          </div>
          {pathSteps.length === 0 ? (
            <p className="text-sm text-[#011B33]/60">{tRec("empty")}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {pathSteps.map((step) => (
                <div key={step.course.slug}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand-accent">
                    {step.role === "now" ? tRec("now") : step.role === "next" ? tRec("next") : tRec("later")}
                    {step.reason ? ` · ${step.reason}` : ""}
                  </p>
                  <CatalogCourseCard course={step.course} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentSurface>
  );
}
