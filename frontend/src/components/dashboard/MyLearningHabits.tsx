"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";

export type LearningHabits = {
  local_date: string;
  week_start: string;
  week_end: string;
  streak_weeks: number;
  visits_this_week: number;
  visit_goal: number;
  visited_today: boolean;
  minutes_this_week: number;
  minutes_goal: number;
  reminder_days: number[];
  reminder_time: string | null;
  reminder_dismissed: boolean;
  reminder_enabled: boolean;
};

const DAY_LABELS: { iso: number; short: string }[] = [
  { iso: 1, short: "Mon" },
  { iso: 2, short: "Tue" },
  { iso: 3, short: "Wed" },
  { iso: 4, short: "Thu" },
  { iso: 5, short: "Fri" },
  { iso: 6, short: "Sat" },
  { iso: 7, short: "Sun" },
];

function Ring({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max <= 0 ? 0 : Math.min(1, value / max);
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#d1d7dc" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

function formatWeekRange(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString(undefined, { day: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function isDueNow(habits: LearningHabits) {
  if (!habits.reminder_enabled || habits.visited_today || !habits.reminder_time) return false;
  const isoDay = new Date(`${habits.local_date}T12:00:00`).getDay();
  const mondayFirst = isoDay === 0 ? 7 : isoDay;
  if (!habits.reminder_days.includes(mondayFirst)) return false;
  const now = new Date();
  const [hh, mm] = habits.reminder_time.split(":").map(Number);
  const due = new Date(now);
  due.setHours(hh, mm, 0, 0);
  return now.getTime() >= due.getTime();
}

function downloadIcs(days: number[], time: string, minutes: number) {
  const byday = days.map((d) => ["MO", "TU", "WE", "TH", "FR", "SA", "SU"][d - 1]).join(",");
  const stamp = time.replace(":", "");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Multivate//Learning reminder//EN",
    "BEGIN:VEVENT",
    "SUMMARY:Multivate learning time",
    `DTSTART:20260105T${stamp}00`,
    `DURATION:PT${minutes}M`,
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([body], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "multivate-learning.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function MyLearningHabits() {
  const [habits, setHabits] = useState<LearningHabits | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [time, setTime] = useState("19:00");
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const localDate = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const visitRes = await fetch("/api/learning/visit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ local_date: localDate }),
        });
        const data = await visitRes.json().catch(() => null);
        if (cancelled) return;
        if (visitRes.ok && data && typeof data.local_date === "string") {
          setHabits(data as LearningHabits);
          return;
        }
        const getRes = await fetch(`/api/learning/habits?local_date=${encodeURIComponent(localDate)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const getData = await getRes.json().catch(() => null);
        if (!cancelled && getRes.ok && getData && typeof getData.local_date === "string") {
          setHabits(getData as LearningHabits);
        }
      } catch {
        /* leave empty; progress cards still work */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localDate]);

  useEffect(() => {
    if (!habits) return;
    if (habits.reminder_days.length) setDays(habits.reminder_days);
    if (habits.reminder_time) setTime(habits.reminder_time);
    setMinutes(habits.minutes_goal);
  }, [habits]);

  useEffect(() => {
    if (!habits || typeof window === "undefined" || !("Notification" in window)) return;
    if (!isDueNow(habits) || Notification.permission !== "granted") return;
    const key = `mv-learn-due-${habits.local_date}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    try {
      new Notification("Time to learn on Multivate", {
        body: "Your scheduled learning time is now.",
      });
    } catch {
      /* browsers may block without a user gesture */
    }
  }, [habits]);

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/learning/habits?local_date=${encodeURIComponent(localDate)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && typeof data.local_date === "string") {
        setHabits(data as LearningHabits);
        setOpenForm(false);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!habits) return null;

  const due = isDueNow(habits);
  const showSchedule = !habits.reminder_dismissed || habits.reminder_enabled || openForm;
  const lit = habits.minutes_this_week > 0 || habits.visits_this_week > 0;

  return (
    <div className="space-y-4">
      {due ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#1457D0]/20 bg-[#E7F1FC] px-4 py-3">
          <p className="text-sm text-[#10244F]">It&apos;s time for your scheduled learning session.</p>
          <Link href="/dashboard" className="text-sm font-bold text-[#1457D0] hover:underline">
            Open a course
          </Link>
        </div>
      ) : null}

      <div className="rounded border border-[#d1d7dc] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-[12rem] flex-1">
            <h2 className="text-lg font-bold text-[#1c1d1f]">Start a weekly streak</h2>
            <p className="mt-1 text-sm text-[#6a6f73]">
              {lit ? "One ring down! Now, watch your course(s)." : "Watch a lesson this week to light the ring."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f7f9fa]" aria-hidden>
                <svg viewBox="0 0 24 24" className={`h-6 w-6 ${habits.streak_weeks > 0 ? "text-[#F69C08]" : "text-[#d1d7dc]"}`} fill="currentColor">
                  <path d="M12 2s3 3.2 3 6.2c0 1.4-.5 2.6-1.3 3.5 1.7-.4 3.3-1.8 4.3-3.7C19.6 12 18 18 12 18S4.4 12 6 8c1 1.9 2.6 3.3 4.3 3.7C9.5 10.8 9 9.6 9 8.2 9 5.2 12 2 12 2zm0 18c4.4 0 8-2.2 8-5 0-.5-.1-1-.2-1.4C18.6 16.5 15.7 18 12 18s-6.6-1.5-7.8-4.4c-.1.4-.2.9-.2 1.4 0 2.8 3.6 5 8 5z" />
                </svg>
              </span>
              <div>
                <p className="text-lg font-bold leading-none text-[#1c1d1f]">{habits.streak_weeks} weeks</p>
                <p className="mt-1 text-xs text-[#6a6f73]">Current streak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Ring value={habits.minutes_this_week} max={habits.minutes_goal} color="#F69C08" />
              <p className="text-sm text-[#6a6f73]">
                <span className="font-bold text-[#1c1d1f]">
                  {habits.minutes_this_week}/{habits.minutes_goal}
                </span>{" "}
                course min
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Ring value={habits.visits_this_week} max={habits.visit_goal} color="#19A463" />
              <div>
                <p className="text-sm text-[#6a6f73]">
                  <span className="font-bold text-[#1c1d1f]">
                    {Math.min(habits.visits_this_week, habits.visit_goal)}/{habits.visit_goal}
                  </span>{" "}
                  visit
                </p>
                <p className="text-xs text-[#6a6f73]">{formatWeekRange(habits.week_start, habits.week_end)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSchedule ? (
        <div className="rounded border border-[#d1d7dc] px-5 py-5 sm:px-6">
          <div className="flex gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d1d7dc] text-[#1c1d1f]" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-[#1c1d1f]">Schedule learning time</h2>
              {habits.reminder_enabled && !openForm ? (
                <p className="mt-1 text-sm text-[#6a6f73]">
                  Reminders on · {habits.reminder_days.map((d) => DAY_LABELS[d - 1]?.short).join(", ")} at{" "}
                  {habits.reminder_time} · {habits.minutes_goal} min / week
                </p>
              ) : (
                <p className="mt-1 max-w-3xl text-sm text-[#6a6f73]">
                  Learning a little each day adds up. Students who make learning a habit are more likely to reach their
                  goals. Set time aside to learn and get reminders using your learning scheduler.
                </p>
              )}

              {openForm ? (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void (async () => {
                      await save({
                        reminder_days: days,
                        reminder_time: time,
                        reminder_minutes: minutes,
                        reminder_dismissed: false,
                      });
                      downloadIcs(days, time, minutes);
                      if ("Notification" in window && Notification.permission === "default") {
                        void Notification.requestPermission();
                      }
                    })();
                  }}
                >
                  <fieldset>
                    <legend className="text-sm font-bold">Days</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {DAY_LABELS.map((day) => {
                        const on = days.includes(day.iso);
                        return (
                          <button
                            key={day.iso}
                            type="button"
                            onClick={() =>
                              setDays((prev) => (prev.includes(day.iso) ? prev.filter((v) => v !== day.iso) : [...prev, day.iso].sort()))
                            }
                            className={`h-9 min-w-12 rounded-full border px-3 text-sm font-bold ${
                              on ? "border-[#1457D0] bg-[#1457D0] text-white" : "border-[#d1d7dc] text-[#1c1d1f]"
                            }`}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-4">
                    <label className="text-sm font-bold">
                      Time
                      <input
                        type="time"
                        value={time}
                        onChange={(event) => setTime(event.target.value)}
                        className="ml-2 h-10 rounded border border-[#1c1d1f] px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="text-sm font-bold">
                      Weekly minutes goal
                      <select
                        value={minutes}
                        onChange={(event) => setMinutes(Number(event.target.value))}
                        className="ml-2 h-10 rounded border border-[#1c1d1f] px-3 text-sm font-normal"
                      >
                        {[15, 30, 45, 60, 90, 120].map((n) => (
                          <option key={n} value={n}>
                            {n} min
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={busy || days.length === 0}
                      className="h-10 bg-[#1457D0] px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Save schedule
                    </button>
                    <button type="button" className="h-10 px-3 text-sm font-bold text-[#1457D0]" onClick={() => setOpenForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenForm(true)}
                    className="h-10 border border-[#1457D0] px-4 text-sm font-bold text-[#1457D0]"
                  >
                    {habits.reminder_enabled ? "Edit" : "Get started"}
                  </button>
                  {habits.reminder_enabled ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void save({ reminder_dismissed: true, reminder_days: [], reminder_time: "" })}
                      className="h-10 px-3 text-sm font-bold text-[#1457D0]"
                    >
                      Turn off
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void save({ reminder_dismissed: true })}
                      className="h-10 px-3 text-sm font-bold text-[#1457D0]"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
