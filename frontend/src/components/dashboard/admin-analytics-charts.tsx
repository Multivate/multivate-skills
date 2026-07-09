"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";

type Point = { date: string; value: number };

const CHART_W = 640;
const CHART_H = 220;
const PAD = { t: 16, r: 12, b: 28, l: 36 };

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function pointX(index: number, count: number) {
  const innerW = CHART_W - PAD.l - PAD.r;
  return PAD.l + (index / Math.max(count - 1, 1)) * innerW;
}

function pointY(value: number, max: number) {
  const innerH = CHART_H - PAD.t - PAD.b;
  return PAD.t + innerH - (value / max) * innerH;
}

function buildPath(points: Point[], max: number): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => {
      const x = pointX(i, points.length);
      const y = pointY(p.value, max);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ChartTooltip({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: ReactNode;
}) {
  const clampedX = Math.min(Math.max(x, 72), 92);
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg transition-opacity duration-150"
      style={{ left: `${clampedX}%`, top: `${Math.max(y - 8, 4)}%` }}
    >
      {children}
    </div>
  );
}

export function GrowthLineChart({
  users,
  enrollments,
}: {
  users: Point[];
  enrollments: Point[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const count = Math.max(users.length, enrollments.length);
  const max = niceMax(Math.max(...users.map((p) => p.value), ...enrollments.map((p) => p.value), 1));
  const innerH = CHART_H - PAD.t - PAD.b;
  const ticks = [0, max / 2, max];

  const pickIndex = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el || count <= 1) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      return Math.round(ratio * (count - 1));
    },
    [count],
  );

  const onMove = (clientX: number) => setActiveIndex(pickIndex(clientX));
  const onLeave = () => setActiveIndex(null);

  const activeUser = activeIndex !== null ? users[activeIndex] : null;
  const activeEnroll = activeIndex !== null ? enrollments[activeIndex] : null;
  const activeDate = activeUser?.date ?? activeEnroll?.date;
  const crossX = activeIndex !== null ? pointX(activeIndex, count) : null;
  const tooltipPctX = crossX !== null ? (crossX / CHART_W) * 100 : 50;
  const tooltipPctY = activeUser ? (pointY(activeUser.value, max) / CHART_H) * 100 : 40;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-auto"
      onMouseLeave={onLeave}
      onTouchEnd={onLeave}
    >
      {activeIndex !== null && activeDate ? (
        <ChartTooltip x={tooltipPctX} y={tooltipPctY}>
          <p className="font-bold text-brand-ink">{formatShortDate(activeDate)}</p>
          <p className="mt-1 flex items-center gap-2 text-admin-indigo">
            <span className="h-2 w-2 rounded-full bg-admin-indigo" aria-hidden />
            <span>
              New users: <strong className="tabular-nums">{activeUser?.value ?? 0}</strong>
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-admin-violet">
            <span className="h-2 w-2 rounded-full bg-admin-violet" aria-hidden />
            <span>
              Enrollments: <strong className="tabular-nums">{activeEnroll?.value ?? 0}</strong>
            </span>
          </p>
        </ChartTooltip>
      ) : null}

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="min-w-[320px] w-full touch-none" role="img" aria-label="User and enrollment growth">
        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.t + innerH * (1 - ratio);
          return <line key={ratio} x1={PAD.l} x2={CHART_W - PAD.r} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {ticks.map((tick) => {
          const y = PAD.t + innerH - (tick / max) * innerH;
          return (
            <text key={tick} x={PAD.l - 6} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
              {Math.round(tick)}
            </text>
          );
        })}

        {crossX !== null ? (
          <line
            x1={crossX}
            x2={crossX}
            y1={PAD.t}
            y2={PAD.t + innerH}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="transition-all duration-150"
          />
        ) : null}

        <path
          d={buildPath(users, max)}
          fill="none"
          stroke="#4338CA"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={buildPath(enrollments, max)}
          fill="none"
          stroke="#7C3AED"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {activeIndex !== null && activeUser ? (
          <>
            <circle
              cx={pointX(activeIndex, count)}
              cy={pointY(activeUser.value, max)}
              r={6}
              fill="#4338CA"
              stroke="#fff"
              strokeWidth="2"
              className="transition-all duration-150"
            />
            {activeEnroll ? (
              <circle
                cx={pointX(activeIndex, count)}
                cy={pointY(activeEnroll.value, max)}
                r={6}
                fill="#7C3AED"
                stroke="#fff"
                strokeWidth="2"
                className="transition-all duration-150"
              />
            ) : null}
          </>
        ) : null}

        {users.length > 0 ? (
          <>
            <text x={PAD.l} y={CHART_H - 8} className="fill-slate-400 text-[10px]">
              {formatShortDate(users[0].date)}
            </text>
            <text x={CHART_W - PAD.r} y={CHART_H - 8} textAnchor="end" className="fill-slate-400 text-[10px]">
              {formatShortDate(users[users.length - 1].date)}
            </text>
          </>
        ) : null}

        <rect
          x={PAD.l}
          y={PAD.t}
          width={CHART_W - PAD.l - PAD.r}
          height={innerH}
          fill="transparent"
          className="cursor-crosshair"
          onMouseMove={(e) => onMove(e.clientX)}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) onMove(touch.clientX);
          }}
        />
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold">
        <span className="inline-flex items-center gap-2 text-admin-indigo">
          <span className="h-2 w-2 rounded-full bg-admin-indigo" aria-hidden />
          New users
        </span>
        <span className="inline-flex items-center gap-2 text-admin-violet">
          <span className="h-2 w-2 rounded-full bg-admin-violet" aria-hidden />
          Enrollments
        </span>
      </div>
    </div>
  );
}

export function RevenueBarChart({ points }: { points: Point[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const slotW = (CHART_W - PAD.l - PAD.r) / Math.max(points.length, 1);
  const barW = Math.max(4, slotW - 2);
  const innerH = CHART_H - PAD.t - PAD.b;

  const active = activeIndex !== null ? points[activeIndex] : null;
  const activeX = activeIndex !== null ? PAD.l + activeIndex * slotW + slotW / 2 : 0;
  const activeH = active && max > 0 ? (active.value / max) * innerH : 0;
  const tooltipPctX = (activeX / CHART_W) * 100;
  const tooltipPctY = active ? ((PAD.t + innerH - activeH) / CHART_H) * 100 : 40;

  return (
    <div className="relative w-full overflow-x-auto" onMouseLeave={() => setActiveIndex(null)}>
      {active ? (
        <ChartTooltip x={tooltipPctX} y={tooltipPctY}>
          <p className="font-bold text-brand-ink">{formatShortDate(active.date)}</p>
          <p className="mt-1 text-brand-accent">
            Revenue: <strong className="tabular-nums">{formatMoney(active.value)}</strong>
          </p>
          <p className="mt-0.5 text-slate-500">{formatMoneyCompact(active.value)}</p>
        </ChartTooltip>
      ) : null}

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="min-w-[320px] w-full" role="img" aria-label="Daily revenue">
        <line x1={PAD.l} x2={CHART_W - PAD.r} y1={PAD.t + innerH} y2={PAD.t + innerH} stroke="#e2e8f0" strokeWidth="1" />
        {points.map((p, i) => {
          const h = max > 0 ? (p.value / max) * innerH : 0;
          const x = PAD.l + i * slotW + 1;
          const y = PAD.t + innerH - h;
          const isActive = activeIndex === i;
          return (
            <g key={p.date}>
              <rect
                x={x - 2}
                y={PAD.t}
                width={barW + 4}
                height={innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setActiveIndex(i)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                role="button"
                aria-label={`${formatShortDate(p.date)}: ${formatMoney(p.value)}`}
              />
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, p.value > 0 ? 2 : 0)}
                rx={2}
                fill={isActive ? "#E86A0A" : "#F27D0C"}
                className="transition-all duration-200 ease-out"
                style={{ opacity: activeIndex === null || isActive ? 1 : 0.35 }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const DONUT_COLORS = ["#4338CA", "#6366F1", "#F27D0C", "#7C3AED", "#0ea5e9"];

export function DonutChart({
  segments,
  centerLabel,
}: {
  segments: { label: string; value: number; color?: string }[];
  centerLabel?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-sm text-slate-500">
        No data yet
      </div>
    );
  }

  const activeSeg = activeIndex !== null ? segments[activeIndex] : null;
  const activePct = activeSeg ? Math.round((activeSeg.value / total) * 100) : null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {segments.map((seg, i) => {
            if (seg.value <= 0) return null;
            const dash = (seg.value / total) * c;
            const isActive = activeIndex === i;
            const isDimmed = activeIndex !== null && !isActive;
            const color = seg.color ?? DONUT_COLORS[i % DONUT_COLORS.length];
            const el = (
              <circle
                key={seg.label}
                cx="64"
                cy="64"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={isActive ? 20 : 16}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="cursor-pointer transition-all duration-200 ease-out"
                style={{ opacity: isDimmed ? 0.25 : 1 }}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                role="button"
                aria-label={`${seg.label}: ${seg.value}`}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {activeSeg && activePct !== null ? (
            <>
              <span className="text-lg font-extrabold tabular-nums text-brand-ink">{activePct}%</span>
              <span className="mt-0.5 max-w-[5rem] truncate text-[10px] font-semibold text-brand-accent">{activeSeg.label}</span>
            </>
          ) : centerLabel ? (
            <span className="text-xl font-extrabold tabular-nums text-brand-ink">{centerLabel}</span>
          ) : null}
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {segments.map((seg, i) => {
          const isActive = activeIndex === i;
          const color = seg.color ?? DONUT_COLORS[i % DONUT_COLORS.length];
          const pct = Math.round((seg.value / total) * 100);
          return (
            <li
              key={seg.label}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-all duration-150 ${
                isActive ? "bg-brand-accent/10 ring-1 ring-brand-accent/30" : "hover:bg-slate-50"
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-150" style={{ backgroundColor: color, transform: isActive ? "scale(1.25)" : "scale(1)" }} aria-hidden />
              <span className={`text-slate-600 ${isActive ? "font-semibold text-brand-ink" : ""}`}>{seg.label}</span>
              <span className="ml-auto font-bold tabular-nums text-brand-ink">{seg.value}</span>
              <span className="w-8 text-right text-xs tabular-nums text-slate-400">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TopCoursesBarChart({
  courses,
}: {
  courses: { title: string; enrollment_count: number }[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...courses.map((c) => c.enrollment_count), 1);

  if (courses.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No courses in catalog yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {courses.map((course, i) => {
        const pct = Math.round((course.enrollment_count / max) * 100);
        const isActive = activeIndex === i;
        return (
          <li
            key={course.title}
            className={`rounded-xl px-2 py-1 transition-all duration-150 ${isActive ? "bg-admin-indigo/5 ring-1 ring-admin-indigo/20" : "hover:bg-slate-50"}`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className={`line-clamp-1 font-semibold ${isActive ? "text-admin-indigo" : "text-brand-ink"}`}>{course.title}</span>
              <span className="shrink-0 font-bold tabular-nums text-admin-indigo">{course.enrollment_count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-admin-indigo transition-all duration-300 ease-out"
                style={{
                  width: `${Math.max(pct, course.enrollment_count > 0 ? 8 : 0)}%`,
                  opacity: activeIndex === null || isActive ? 1 : 0.35,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
