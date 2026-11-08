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

export function formatCourseDuration(minutes: number): string {
  if (minutes <= 0) return "Flexible";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}
