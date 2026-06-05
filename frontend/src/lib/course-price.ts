/** Format a course price from API cents + currency. */
export function formatCoursePrice(
  priceCents: number,
  currency: string,
  isFree: boolean,
): string {
  if (isFree || priceCents <= 0) return "Free";
  const code = currency.trim().toUpperCase() || "NGN";
  return new Intl.NumberFormat(code === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency: code,
  }).format(priceCents / 100);
}

export function formatCourseDuration(minutes: number): string {
  if (minutes <= 0) return "Flexible";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}
