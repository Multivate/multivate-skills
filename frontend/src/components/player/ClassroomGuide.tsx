"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";

type PathStep = {
  order: number;
  track: string;
  role: string;
  reason: string;
  course: { slug: string; title: string };
};

type LearningPath = {
  goal_code: string;
  topic: string;
  german_level: string;
  session_minutes: number;
  week_days: number;
  week_minutes: number;
  summary: string;
  steps: PathStep[];
};

type Habits = {
  minutes_this_week: number;
  minutes_goal: number;
  visits_this_week: number;
  visit_goal: number;
  visit_dates?: string[];
  week_start: string;
};

const GOALS = ["work", "study", "train", "live", "explore"] as const;

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function weekDays(weekStart: string | null) {
  const start = weekStart ? new Date(`${weekStart}T00:00:00`) : startOfMonday(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return { iso, label: day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2) };
  });
}

function startOfMonday(now: Date) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - weekday);
  return day;
}

function sessionKey(date: string) {
  return `multivate_classroom_session:${date}`;
}

function readRemaining(date: string, fallbackMinutes: number) {
  try {
    const raw = window.sessionStorage.getItem(sessionKey(date));
    if (!raw) return fallbackMinutes * 60;
    const parsed = JSON.parse(raw) as { remaining?: number };
    if (typeof parsed.remaining === "number") return Math.max(0, parsed.remaining);
  } catch {
    /* ignore */
  }
  return fallbackMinutes * 60;
}

function formatClock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ClassroomGuide({
  courseSlug,
  courseTitle,
  lessonId,
  lessonTitle,
  preview = false,
  compact = false,
}: {
  courseSlug: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  preview?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("classroom");
  const [path, setPath] = useState<LearningPath | null>(null);
  const [habits, setHabits] = useState<Habits | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    const date = todayStamp();
    (async () => {
      const [pathRes, visitRes] = await Promise.all([
        fetch("/api/learning/path", { credentials: "include", cache: "no-store" }),
        fetch("/api/learning/visit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ local_date: date }),
        }),
      ]);
      const pathData = await pathRes.json().catch(() => null);
      const visitData = await visitRes.json().catch(() => null);
      if (cancelled) return;
      if (pathRes.ok && pathData?.goal_code) setPath(pathData as LearningPath);
      if (visitRes.ok && visitData?.week_start) setHabits(visitData as Habits);
    })();
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const sessionMinutes = path?.session_minutes ?? 30;

  useEffect(() => {
    if (preview) return;
    const date = todayStamp();
    setRemaining(readRemaining(date, sessionMinutes));
  }, [preview, sessionMinutes]);

  useEffect(() => {
    if (preview || remaining === null) return;
    if (remaining <= 0) {
      setEnded(true);
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        const next = Math.max(0, prev - 1);
        try {
          window.sessionStorage.setItem(sessionKey(todayStamp()), JSON.stringify({ remaining: next }));
        } catch {
          /* ignore */
        }
        if (next <= 0) setEnded(true);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [preview, remaining === null]);

  const step = useMemo(
    () => path?.steps.find((row) => row.course.slug === courseSlug) ?? path?.steps[0] ?? null,
    [path, courseSlug],
  );

  if (preview) return null;

  const goal = GOALS.includes((path?.goal_code ?? "explore") as (typeof GOALS)[number])
    ? (path?.goal_code as (typeof GOALS)[number])
    : "explore";
  const days = weekDays(habits?.week_start ?? null);
  const visited = new Set(habits?.visit_dates ?? []);
  const today = todayStamp();
  const weekDone =
    Boolean(habits) &&
    ((habits?.visits_this_week ?? 0) >= (habits?.visit_goal ?? 1) ||
      (habits?.minutes_this_week ?? 0) >= (habits?.minutes_goal ?? 1));

  const mentorHref = `/dashboard/book-1on1?course=${encodeURIComponent(courseSlug)}&goal=${encodeURIComponent(goal)}&lesson=${encodeURIComponent(lessonId ?? "")}&stuck=1`;

  return (
    <section className={`border-b border-brand-ink/10 bg-white ${compact ? "px-3 py-2.5" : "px-4 py-3 sm:px-5"}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1" aria-label={t("weekLabel")}>
          {days.map((day) => {
            const on = visited.has(day.iso);
            const isToday = day.iso === today;
            return (
              <span
                key={day.iso}
                title={day.iso}
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                  on
                    ? "bg-brand-accent text-white"
                    : isToday
                      ? "ring-2 ring-brand-accent text-brand-accent"
                      : "bg-[#eef2f8] text-[#10244F]/40"
                }`}
              >
                {day.label}
              </span>
            );
          })}
        </div>
        <p className="text-xs tabular-nums text-[#10244F]/60">
          {t("weekMinutes", {
            minutes: habits?.minutes_this_week ?? 0,
            goal: habits?.minutes_goal ?? path?.week_minutes ?? 150,
          })}
        </p>
        <p className={`ml-auto text-xs font-semibold tabular-nums ${ended ? "text-brand-accent" : "text-[#10244F]"}`}>
          {ended ? t("sessionDone") : t("sessionLeft", { time: formatClock(remaining ?? sessionMinutes * 60) })}
        </p>
      </div>

      <div className={`mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${compact ? "" : "sm:gap-6"}`}>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">{t("whyLabel")}</p>
          <p className={`mt-0.5 text-sm leading-snug text-[#10244F] ${compact ? "line-clamp-2" : ""}`}>
            {t(`goalWhy.${goal}`)}
            {step?.reason ? ` ${step.reason}.` : ""}
          </p>
          {weekDone ? <p className="mt-1 text-xs text-[#10244F]/60">{t(`germanyNext.${goal}`)}</p> : null}
          {ended && !weekDone ? <p className="mt-1 text-xs text-[#10244F]/60">{t("sessionHint")}</p> : null}
        </div>
        <Link
          href={mentorHref}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[5px] border border-brand-ink/15 px-3 text-xs font-semibold text-[#10244F] hover:border-brand-accent hover:text-brand-accent"
        >
          {t("askMentor")}
        </Link>
      </div>
      {courseTitle && !compact ? (
        <p className="mt-1 truncate text-[11px] text-[#10244F]/40">
          {courseTitle}
          {lessonTitle ? ` · ${lessonTitle}` : ""}
        </p>
      ) : null}
    </section>
  );
}
