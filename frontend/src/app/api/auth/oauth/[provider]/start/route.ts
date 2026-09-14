import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";
import {
  oauthErrorRedirect,
  resolveLocale,
  safeAppPath,
} from "@/app/api/auth/oauth/_oauthRedirect";

const PROVIDERS = new Set(["google", "apple"]);
const ROLES = new Set(["student", "instructor", "mentor"]);

export async function GET(
  req: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ detail: "Unknown sign-in provider" }, { status: 404 });
  }

  const url = new URL(req.url);
  const returnTo = safeAppPath(url.searchParams.get("return_to") || "/dashboard");
  const locale = resolveLocale(url.searchParams.get("locale"));
  const errorPath = safeAppPath(url.searchParams.get("error_to") || "/login", "/login");
  const roleRaw = (url.searchParams.get("role") || "").trim().toLowerCase();
  const role = ROLES.has(roleRaw) ? roleRaw : "";

  console.log(`[oauth/${provider}/start] return_to=${returnTo} locale=${locale} role=${role || "-"}`);

  try {
    const qs = new URLSearchParams({ return_to: returnTo });
    if (role) qs.set("role", role);
    const upstream = await fetchInternal(`/api/v1/auth/oauth/${provider}/start?${qs.toString()}`);
    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error(`[oauth/${provider}/start] backend status=${upstream.status}`, data);
      return oauthErrorRedirect(
        req,
        locale,
        upstream.status === 503 ? "unavailable" : "failed",
        errorPath,
      );
    }

    const authorizeUrl = (data as { authorize_url?: string }).authorize_url;
    if (!authorizeUrl) {
      console.error(`[oauth/${provider}/start] missing authorize_url`);
      return oauthErrorRedirect(req, locale, "failed", errorPath);
    }

    console.log(`[oauth/${provider}/start] redirecting to provider`);
    const res = NextResponse.redirect(authorizeUrl);
    const cookieBase = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 600,
      secure: process.env.NODE_ENV === "production",
    };
    res.cookies.set("oauth_locale", locale, cookieBase);
    res.cookies.set("oauth_error_path", errorPath, cookieBase);
    return res;
  } catch (e) {
    console.error(`[oauth/${provider}/start] error`, e);
    handleProxyError(e);
    return oauthErrorRedirect(req, locale, "unavailable", errorPath);
  }
}
