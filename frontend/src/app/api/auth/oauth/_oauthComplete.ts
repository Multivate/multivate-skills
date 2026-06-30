import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";
import { fetchInternal } from "@/lib/internal-api";
import { routing, type AppLocale } from "@/i18n/routing";

const secure = process.env.NODE_ENV === "production";

type OAuthProvider = "google" | "apple";

function isLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

function loginRedirect(request: Request, locale: AppLocale, reason?: string) {
  const login = new URL(`/${locale}/login`, request.url);
  if (reason) login.searchParams.set("oauth_error", reason);
  const res = NextResponse.redirect(login);
  res.cookies.set("oauth_locale", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}

function dashboardRedirect(request: Request, locale: AppLocale, returnTo: string) {
  const safe = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
  const hasLocale = routing.locales.some((loc) => safe === `/${loc}` || safe.startsWith(`/${loc}/`));
  const path = hasLocale ? safe : `/${locale}${safe === "/" ? "" : safe}`;
  return NextResponse.redirect(new URL(path, request.url));
}

export async function completeOAuthSignIn(
  provider: OAuthProvider,
  payload: { code: string; state: string; name?: string },
  request: Request,
): Promise<NextResponse> {
  const jar = await cookies();
  const localeRaw = jar.get("oauth_locale")?.value || routing.defaultLocale;
  const locale: AppLocale = isLocale(localeRaw) ? localeRaw : routing.defaultLocale;

  console.log(`[oauth/${provider}/callback] exchanging code with backend locale=${locale}`);

  try {
    const upstream = await fetchInternal(`/api/v1/auth/oauth/${provider}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const detail =
        data && typeof data === "object" && typeof (data as { detail?: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : "";
      console.error(`[oauth/${provider}/callback] backend rejected sign-in status=${upstream.status}`, detail);
      const reason = upstream.status === 503 ? "unavailable" : "failed";
      return loginRedirect(request, locale, reason);
    }

    const access = data.access_token as string | undefined;
    const refresh = data.refresh_token as string | undefined;
    const returnTo = typeof data.return_to === "string" ? data.return_to : "/dashboard";

    if (!access || !refresh) {
      console.error(`[oauth/${provider}/callback] missing tokens in upstream response`);
      return loginRedirect(request, locale, "failed");
    }

    console.log(`[oauth/${provider}/callback] sign-in ok redirect=${returnTo}`);
    const res = dashboardRedirect(request, locale, returnTo);
    setAuthCookies(res, access, refresh, secure);
    res.cookies.set("oauth_locale", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error(`[oauth/${provider}/callback] upstream error`, err);
    const res = loginRedirect(request, locale, "failed");
    clearAuthCookies(res, secure);
    return res;
  }
}
