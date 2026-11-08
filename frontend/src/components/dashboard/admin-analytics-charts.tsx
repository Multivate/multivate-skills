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

function smoothPath(points: Point[], max: number): string {
  if (points.length === 0) return "";
  const coords = points.map((point, index) => [pointX(index, points.length), pointY(point.value, max)] as const);
  let path = `M${coords[0][0].toFixed(1)},${coords[0][1].toFixed(1)}`;
  for (let index = 0; index < coords.length - 1; index += 1) {
    const [x0, y0] = coords[index];
    const [x1, y1] = coords[index + 1];
    const mid = (x0 + x1) / 2;
    path += ` C${mid.toFixed(1)},${y0.toFixed(1)} ${mid.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return path;
}

function buildArea(points: Point[], max: number): string {
  if (points.length === 0) return "";
  const base = pointY(0, max).toFixed(1);
  const first = pointX(0, points.length).toFixed(1);
  const last = pointX(points.length - 1, points.length).toFixed(1);
  return `${smoothPath(points, max)} L${last},${base} L${first},${base} Z`;
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
      className="admin-card pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg px-3 py-2 text-xs shadow-sm transition-opacity duration-150"
      style={{ left: `${clampedX}%`, top: `${Math.max(y - 8, 4)}%` }}
    >
      {children}
    </div>
  );
}

export function GrowthLineChart({
  users,
  enrollments,
  hideLegend = false,
}: {
  users: Point[];
  enrollments: Point[];
  hideLegend?: boolean;
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
          <p className="font-semibold admin-ink">{formatShortDate(activeDate)}</p>
          <p className="mt-1 flex items-center gap-2 admin-muted">
            <span className="h-2 w-2 rounded-full bg-brand-ink" aria-hidden />
            <span>
              New users: <strong className="tabular-nums admin-ink">{activeUser?.value ?? 0}</strong>
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-2 admin-muted">
            <span className="h-2 w-2 rounded-full bg-brand-accent" aria-hidden />
            <span>
              Enrollments: <strong className="tabular-nums admin-ink">{activeEnroll?.value ?? 0}</strong>
            </span>
          </p>
        </ChartTooltip>
      ) : null}

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-auto w-full touch-none" role="img" aria-label="User and enrollment growth">
        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.t + innerH * (1 - ratio);
          return <line key={ratio} x1={PAD.l} x2={CHART_W - PAD.r} y1={y} y2={y} stroke="var(--admin-line, #d7e6f7)" strokeWidth="1" />;
        })}
        {ticks.map((tick) => {
          const y = PAD.t + innerH - (tick / max) * innerH;
          return (
            <text key={tick} x={PAD.l - 6} y={y + 4} textAnchor="end" fill="var(--admin-muted, #8aa)" className="text-[10px]">
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
            stroke="#9AA3B2"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="transition-all duration-150"
          />
        ) : null}

        <path d={buildArea(users, max)} fill="var(--admin-series-a, #7c6bf2)" opacity="0.22" className="animate-fade-in" />
        <path d={buildArea(enrollments, max)} fill="var(--admin-series-b, #2f9fe0)" opacity="0.2" className="animate-fade-in" />
        <path
          d={smoothPath(users, max)}
          fill="none"
          stroke="var(--admin-series-a, #7c6bf2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-chart-draw"
        />
        <path
          d={smoothPath(enrollments, max)}
          fill="none"
          stroke="var(--admin-series-b, #2f9fe0)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-chart-draw"
          style={{ animationDelay: "120ms" }}
        />
        {users.map((point, i) =>
          point.value > 0 ? (
            <circle key={`user-${point.date}`} cx={pointX(i, count)} cy={pointY(point.value, max)} r={4} fill="var(--admin-series-a, #10244f)" stroke="var(--admin-card, #fff)" strokeWidth="2" />
          ) : null,
        )}
        {enrollments.map((point, i) =>
          point.value > 0 ? (
            <circle key={`enroll-${point.date}`} cx={pointX(i, count)} cy={pointY(point.value, max)} r={4} fill="var(--admin-series-b, #1457d0)" stroke="var(--admin-card, #fff)" strokeWidth="2" />
          ) : null,
        )}

        {activeIndex !== null && activeUser ? (
          <>
            <circle
              cx={pointX(activeIndex, count)}
              cy={pointY(activeUser.value, max)}
              r={6}
              fill="var(--admin-series-a, #10244f)"
              stroke="#fff"
              strokeWidth="2"
              className="transition-all duration-150"
            />
            {activeEnroll ? (
              <circle
                cx={pointX(activeIndex, count)}
                cy={pointY(activeEnroll.value, max)}
                r={6}
                fill="var(--admin-series-b, #1457d0)"
                stroke="#fff"
                strokeWidth="2"
                className="transition-all duration-150"
              />
            ) : null}
          </>
        ) : null}

        {users.length > 0 ? (
          <>
            <text x={PAD.l} y={CHART_H - 8} fill="var(--admin-muted, #8aa)" className="text-[10px]">
              {formatShortDate(users[0].date)}
            </text>
            <text x={CHART_W - PAD.r} y={CHART_H - 8} textAnchor="end" fill="var(--admin-muted, #8aa)" className="text-[10px]">
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

      {hideLegend ? null : <div className="mt-3 flex flex-wrap gap-5 border-t border-[var(--admin-line,#e3ebf5)] pt-3 text-xs font-semibold admin-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--admin-series-a, #10244f)" }} aria-hidden />
          New users
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: "var(--admin-series-b, #1457d0)" }} aria-hidden />
          Enrollments
        </span>
      </div>}
    </div>
  );
}

export function RevenueBarChart({ points }: { points: Point[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const slotW = (CHART_W - PAD.l - PAD.r) / Math.max(points.length, 1);
  const barW = Math.max(4, slotW - 2);
  const innerH = CHART_H - PAD.t - PAD.b;

  if (points.length === 0 || points.every((point) => point.value <= 0)) {
    return <p className="flex h-40 items-center justify-center text-sm admin-muted">No completed payments in this period.</p>;
  }

  const active = activeIndex !== null ? points[activeIndex] : null;
  const activeX = activeIndex !== null ? PAD.l + activeIndex * slotW + slotW / 2 : 0;
  const activeH = active && max > 0 ? (active.value / max) * innerH : 0;
  const tooltipPctX = (activeX / CHART_W) * 100;
  const tooltipPctY = active ? ((PAD.t + innerH - activeH) / CHART_H) * 100 : 40;

  return (
    <div className="relative w-full overflow-x-auto" onMouseLeave={() => setActiveIndex(null)}>
      {active ? (
        <ChartTooltip x={tooltipPctX} y={tooltipPctY}>
          <p className="font-semibold admin-ink">{formatShortDate(active.date)}</p>
          <p className="mt-1 admin-muted">
            Revenue: <strong className="tabular-nums admin-ink">{formatMoney(active.value)}</strong>
          </p>
          <p className="mt-0.5 admin-muted">{formatMoneyCompact(active.value)}</p>
        </ChartTooltip>
      ) : null}

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="h-auto w-full max-w-3xl" role="img" aria-label="Daily revenue">
        <line x1={PAD.l} x2={CHART_W - PAD.r} y1={PAD.t + innerH} y2={PAD.t + innerH} stroke="#d7e6f7" strokeWidth="1" />
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
                rx={1}
                fill={isActive ? "#0E3F9E" : "#1457D0"}
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

const DONUT_COLORS = ["#0E1420", "#3A4660", "#C45F08", "#E8790A", "#6B7280"];

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
      <div className="flex flex-col items-center justify-center py-6 text-sm admin-muted">
        No data yet
      </div>
    );
  }

  const activeSeg = activeIndex !== null ? segments[activeIndex] : null;
  const activePct = activeSeg ? Math.round((activeSeg.value / total) * 100) : null;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#E7F1FC" strokeWidth="16" />
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {activeSeg && activePct !== null ? (
            <>
              <span className="font-display text-lg font-bold tabular-nums admin-ink">{activePct}%</span>
              <span className="mt-0.5 max-w-[5rem] truncate text-[10px] font-semibold admin-muted">
                {activeSeg.label}
              </span>
            </>
          ) : centerLabel ? (
            <>
              <span className="font-display text-xl font-bold tabular-nums admin-ink">{centerLabel}</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] admin-muted">
                Total
              </span>
            </>
          ) : null}
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1 text-sm sm:flex-1">
        {segments.map((seg, i) => {
          const isActive = activeIndex === i;
          const color = seg.color ?? DONUT_COLORS[i % DONUT_COLORS.length];
          const pct = Math.round((seg.value / total) * 100);
          return (
            <li
              key={seg.label}
              className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors duration-150 ${
                isActive ? "bg-[var(--admin-soft,#e7f1fc)]" : "hover:bg-[var(--admin-soft,#e7f1fc)]"
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-150"
                style={{ backgroundColor: color, transform: isActive ? "scale(1.2)" : "scale(1)" }}
                aria-hidden
              />
              <span className={`min-w-0 truncate ${isActive ? "font-semibold admin-ink" : "admin-muted"}`}>
                {seg.label}
              </span>
              <span className="ml-auto font-semibold tabular-nums admin-ink">{seg.value}</span>
              <span className="w-9 text-right text-xs tabular-nums admin-muted">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const COLUMN_COLORS = ["#1457D0", "#7C5CDB", "#1F8A4C", "#E07A2F", "#0E8A8A", "#C43B7A"];

export function CourseColumnChart({
  courses,
}: {
  courses: { title: string; enrollment_count: number }[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...courses.map((course) => course.enrollment_count), 1);

  if (courses.length === 0) {
    return <p className="py-8 text-center text-sm admin-muted">No courses in catalog yet.</p>;
  }

  return (
    <div className="flex h-56 items-end gap-3" onMouseLeave={() => setActiveIndex(null)}>
      {courses.map((course, index) => {
        const height = course.enrollment_count <= 0 ? 6 : Math.max(18, Math.round((course.enrollment_count / max) * 100));
        const active = activeIndex === index;
        return (
          <button
            key={course.title}
            type="button"
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
          >
            <span className="text-xs font-semibold tabular-nums">{course.enrollment_count}</span>
            <span className="flex h-36 w-full items-end justify-center">
              <span
                className="w-8 max-w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${height}%`,
                  background: COLUMN_COLORS[index % COLUMN_COLORS.length],
                  opacity: activeIndex === null || active ? 1 : 0.35,
                }}
              />
            </span>
            <span className={`line-clamp-2 h-8 text-center text-[11px] leading-4 ${active ? "font-semibold admin-ink" : "admin-muted"}`}>
              {course.title}
            </span>
          </button>
        );
      })}
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
    return <p className="py-8 text-center text-sm admin-muted">No courses in catalog yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {courses.map((course, i) => {
        const pct = Math.round((course.enrollment_count / max) * 100);
        const isActive = activeIndex === i;
        return (
          <li
            key={course.title}
            className={`px-1 py-1 transition-colors duration-150 ${isActive ? "bg-[var(--admin-soft,#e7f1fc)]" : "hover:bg-[var(--admin-soft,#e7f1fc)]"}`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className={`line-clamp-1 font-semibold ${isActive ? "admin-ink" : "admin-ink"}`}>
                {course.title}
              </span>
              <span className="shrink-0 font-semibold tabular-nums admin-ink">{course.enrollment_count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E7F1FC]">
              <div
                className="h-full origin-left rounded-full bg-[#1457D0] animate-rule-grow"
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
