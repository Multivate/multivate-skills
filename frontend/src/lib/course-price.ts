export const DISCOUNT_PERCENTS = [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100] as const;

export function formatCoursePrice(
  priceCents: number,
  currency: string,
  isFree: boolean,
): string {
  if (isFree || priceCents <= 0) return "Free";
  const code = currency.trim().toUpperCase() || "NGN";
  const amount = priceCents / 100;
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(code === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency: code,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

export function saleIsLive(percent?: number | null, expiresAt?: string | null, now = Date.now()) {
  if (!percent || percent <= 0 || !expiresAt) return false;
  const end = new Date(expiresAt).getTime();
  return Number.isFinite(end) && end > now;
}

export function salePriceCents(
  listCents: number,
  percent?: number | null,
  expiresAt?: string | null,
  now = Date.now(),
) {
  if (listCents <= 0 || !saleIsLive(percent, expiresAt, now)) return null;
  return Math.max(0, Math.round(listCents * (100 - (percent ?? 0)) / 100));
}

export function formatCountdown(expiresAt: string, now = Date.now()) {
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return "";
  const remain = Math.max(0, end - now);
  const totalSec = Math.floor(remain / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

export function formatCourseDuration(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

export function courseLevelLabel(course: {
  level?: string | null;
  cefr_level?: string | null;
  category?: string | null;
}): string {
  const raw = (course.level || "beginner").toLowerCase();
  const label = raw === "intermediate" ? "Intermediate" : raw === "advanced" ? "Advanced" : "Beginner";
  const cefr = (course.cefr_level || "").trim().toUpperCase();
  const german = (course.category || "").toLowerCase() === "german";
  if (german && cefr) return `${label} · ${cefr}`;
  return label;
}

export function courseSizeBits(course: {
  duration_minutes?: number | null;
  modules_count?: number | null;
  lessons_count?: number | null;
}): string[] {
  const bits: string[] = [];
  const hours = formatCourseDuration(course.duration_minutes ?? 0);
  if (hours) bits.push(hours);
  const modules = course.modules_count ?? 0;
  if (modules > 0) bits.push(modules === 1 ? "1 module" : `${modules} modules`);
  const lessons = course.lessons_count ?? 0;
  if (lessons > 0) bits.push(lessons === 1 ? "1 lesson" : `${lessons} lessons`);
  return bits;
}
