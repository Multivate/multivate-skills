import { NextResponse } from "next/server";
import { routing, type AppLocale } from "@/i18n/routing";

function isLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

/** Prefer public Host / X-Forwarded-Host; never redirect browsers to 0.0.0.0. */
export function publicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = request.headers.get("host")?.split(",")[0]?.trim();
  let host = forwardedHost || hostHeader || "localhost:3000";
  if (!host || host.startsWith("0.0.0.0") || host.startsWith("[::]")) {
    host = "localhost:3000";
  }
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function resolveLocale(raw: string | null | undefined): AppLocale {
  if (raw && isLocale(raw)) return raw;
  return routing.defaultLocale;
}

export function safeAppPath(path: string, fallback = "/dashboard"): string {
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return fallback;
}

export function oauthErrorRedirect(
  request: Request,
  locale: AppLocale,
  reason: string,
  errorPath: string = "/login",
): NextResponse {
  const base = safeAppPath(errorPath, "/login");
  const hasLocale = routing.locales.some((loc) => base === `/${loc}` || base.startsWith(`/${loc}/`));
  const path = hasLocale ? base : `/${locale}${base === "/" ? "" : base}`;
  const url = new URL(path, publicOrigin(request));
  url.searchParams.set("oauth_error", reason);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_locale", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  res.cookies.set("oauth_error_path", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

export function appPathRedirect(request: Request, locale: AppLocale, returnTo: string): NextResponse {
  const safe = safeAppPath(returnTo, "/dashboard");
  const hasLocale = routing.locales.some((loc) => safe === `/${loc}` || safe.startsWith(`/${loc}/`));
  const path = hasLocale ? safe : `/${locale}${safe === "/" ? "" : safe}`;
  return NextResponse.redirect(new URL(path, publicOrigin(request)));
}
