export type VisitorGeo = {
  country_code: string;
  in_nigeria: boolean;
  display_currency: string;
  ngn_per_usd: number;
  on_premise_allowed: boolean;
  warning: string | null;
};

export const GEO_COOKIE = "mv_geo";

export function parseGeoCookie(raw: string | undefined | null): Pick<VisitorGeo, "in_nigeria" | "country_code"> | null {
  const code = (raw || "").trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return null;
  return { country_code: code, in_nigeria: code === "NG" };
}

export function toDisplayMoney(
  priceCents: number,
  currency: string,
  geo: Pick<VisitorGeo, "in_nigeria" | "ngn_per_usd"> | null | undefined,
): { cents: number; currency: string } {
  const code = (currency || "NGN").trim().toUpperCase() || "NGN";
  if (!geo || geo.in_nigeria || code !== "NGN" || priceCents <= 0) {
    return { cents: priceCents, currency: code };
  }
  const rate = geo.ngn_per_usd > 0 ? geo.ngn_per_usd : 1500;
  const naira = priceCents / 100;
  const usdCents = Math.max(1, Math.round((naira / rate) * 100));
  return { cents: usdCents, currency: "USD" };
}
