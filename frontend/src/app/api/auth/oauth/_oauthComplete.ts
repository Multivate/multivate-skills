import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";
import {
  appPathRedirect,
  oauthErrorRedirect,
  resolveLocale,
  safeAppPath,
} from "@/app/api/auth/oauth/_oauthRedirect";
import { fetchInternal } from "@/lib/internal-api";
import type { AppLocale } from "@/i18n/routing";

const secure = process.env.NODE_ENV === "production";

type OAuthProvider = "google" | "apple";

export async function completeOAuthSignIn(
  provider: OAuthProvider,
  payload: { code: string; state: string; name?: string },
  request: Request,
): Promise<NextResponse> {
  const jar = await cookies();
  const locale: AppLocale = resolveLocale(jar.get("oauth_locale")?.value);
  const errorPath = safeAppPath(jar.get("oauth_error_path")?.value || "/login", "/login");

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
      return oauthErrorRedirect(request, locale, reason, errorPath);
    }

    const access = data.access_token as string | undefined;
    const refresh = data.refresh_token as string | undefined;
    const returnTo = typeof data.return_to === "string" ? data.return_to : "/dashboard";

    if (!access || !refresh) {
      console.error(`[oauth/${provider}/callback] missing tokens in upstream response`);
      return oauthErrorRedirect(request, locale, "failed", errorPath);
    }

    console.log(`[oauth/${provider}/callback] sign-in ok redirect=${returnTo}`);
    const res = appPathRedirect(request, locale, returnTo);
    setAuthCookies(res, access, refresh, secure);
    res.cookies.set("oauth_locale", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    res.cookies.set("oauth_error_path", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error(`[oauth/${provider}/callback] upstream error`, err);
    const res = oauthErrorRedirect(request, locale, "failed", errorPath);
    clearAuthCookies(res, secure);
    return res;
  }
}
