"use client";

import { useMemo, useState } from "react";

export const INSTRUCTOR_CHART_COLORS = ["#1457D0", "#10244F", "#3D8BFF", "#0E8A9A", "#5B6CFF", "#1D4ED8", "#0B3A8A", "#67A8FF"];

type CoursePoint = {
  slug: string;
  title: string;
  enrollment_count: number;
  lessons_count: number;
};

function niceMax(value: number) {
  if (value <= 0) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

export function InstructorEnrollmentColumns({ courses }: { courses: CoursePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const ranked = useMemo(() => [...courses].sort((a, b) => b.enrollment_count - a.enrollment_count).slice(0, 8), [courses]);
  const max = niceMax(Math.max(...ranked.map((row) => row.enrollment_count), 1));

  if (ranked.length === 0) {
    return <p className="flex h-56 items-center justify-center text-sm text-[#011B33]/50">No courses yet.</p>;
  }

  return (
    <div className="flex h-[18.5rem] items-end gap-3 sm:gap-4" onMouseLeave={() => setActive(null)}>
      {ranked.map((course, index) => {
        const height = Math.max(8, Math.round((course.enrollment_count / max) * 100));
        const isActive = active === index;
        const color = INSTRUCTOR_CHART_COLORS[index % INSTRUCTOR_CHART_COLORS.length];
        return (
          <button
            key={course.slug}
            type="button"
            className="group flex min-w-0 flex-1 flex-col items-center gap-2"
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            aria-label={`${course.title}: ${course.enrollment_count} enrollments`}
          >
            <span
              className={`text-xs font-bold tabular-nums transition duration-200 ${
                isActive || active === null ? "text-[#011B33]" : "text-[#011B33]/35"
              }`}
            >
              {course.enrollment_count}
            </span>
            <span className="flex h-40 w-full items-end justify-center">
              <span
                className="w-9 max-w-[85%] origin-bottom rounded-t-[6px] transition-all duration-500 ease-out animate-rule-grow"
                style={{
                  height: `${height}%`,
                  background: `linear-gradient(180deg, ${color} 0%, #10244F 140%)`,
                  boxShadow: isActive ? `0 10px 22px ${color}55` : "none",
                  opacity: active === null || isActive ? 1 : 0.28,
                  transform: isActive ? "scaleX(1.08)" : "scaleX(1)",
                }}
              />
            </span>
            <span className={`line-clamp-2 h-8 w-full text-center text-[11px] leading-4 ${isActive ? "font-bold text-[#011B33]" : "text-[#011B33]/50"}`}>
              {course.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function InstructorEnrollmentShare({ courses }: { courses: CoursePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const ranked = useMemo(() => [...courses].filter((row) => row.enrollment_count > 0).sort((a, b) => b.enrollment_count - a.enrollment_count), [courses]);
  const total = ranked.reduce((sum, row) => sum + row.enrollment_count, 0);
  const r = 58;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold">No enrollments yet</p>
        <p className="mt-1 text-xs text-[#011B33]/50">Share appears after a student joins a course.</p>
      </div>
    );
  }

  const activeRow = active !== null ? ranked[active] : null;
  const activePct = activeRow ? Math.round((activeRow.enrollment_count / total) * 100) : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 148 148" className="h-full w-full -rotate-90">
          <circle cx="74" cy="74" r={r} fill="none" stroke="#E7F1FC" strokeWidth="18" />
          {ranked.map((row, index) => {
            const dash = (row.enrollment_count / total) * c;
            const color = INSTRUCTOR_CHART_COLORS[index % INSTRUCTOR_CHART_COLORS.length];
            const isActive = active === index;
            const el = (
              <circle
                key={row.slug}
                cx="74"
                cy="74"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={isActive ? 22 : 18}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                className="cursor-pointer transition-all duration-300"
                style={{ opacity: active === null || isActive ? 1 : 0.22 }}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {activeRow && activePct !== null ? (
            <>
              <span className="text-2xl font-extrabold tabular-nums text-[#10244F]">{activePct}%</span>
              <span className="mt-0.5 max-w-[6.5rem] truncate text-[11px] font-semibold text-[#011B33]/50">{activeRow.title}</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-extrabold tabular-nums text-[#10244F]">{total}</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#011B33]/40">Enrolled</span>
            </>
          )}
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {ranked.map((row, index) => {
          const color = INSTRUCTOR_CHART_COLORS[index % INSTRUCTOR_CHART_COLORS.length];
          const pct = Math.round((row.enrollment_count / total) * 100);
          const isActive = active === index;
          return (
            <li key={row.slug}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left transition duration-200 ${
                  isActive ? "bg-[#eef4ff]" : "hover:bg-[#f6f9fd]"
                }`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{row.title}</span>
                <span className="text-sm font-bold tabular-nums">{row.enrollment_count}</span>
                <span className="w-10 text-right text-xs tabular-nums text-[#011B33]/45">{pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function InstructorLessonMix({ courses }: { courses: CoursePoint[] }) {
  const ranked = useMemo(() => [...courses].sort((a, b) => b.lessons_count - a.lessons_count).slice(0, 6), [courses]);
  const max = Math.max(...ranked.map((row) => Math.max(row.lessons_count, row.enrollment_count)), 1);

  if (ranked.length === 0) return null;

  return (
    <ul className="space-y-4">
      {ranked.map((row, index) => (
        <li key={row.slug}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="truncate text-sm font-bold">{row.title}</p>
            <p className="shrink-0 text-xs tabular-nums text-[#011B33]/50">
              {row.lessons_count} lessons · {row.enrollment_count} enrolled
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-[#E7F1FC]">
              <div
                className="h-full origin-left rounded-full bg-[#1457D0] animate-rule-grow"
                style={{ width: `${Math.max(6, (row.enrollment_count / max) * 100)}%` }}
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E7F1FC]">
              <div
                className="h-full origin-left rounded-full bg-[#10244F] animate-rule-grow"
                style={{
                  width: `${Math.max(6, (row.lessons_count / max) * 100)}%`,
                  animationDelay: `${80 + index * 40}ms`,
                }}
              />
            </div>
          </div>
        </li>
      ))}
      <li className="flex gap-5 pt-1 text-xs font-semibold text-[#011B33]/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#1457D0]" /> Enrollments
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#10244F]" /> Lessons
        </span>
      </li>
    </ul>
  );
}
