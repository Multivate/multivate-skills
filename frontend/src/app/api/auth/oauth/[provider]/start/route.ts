import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";
import { routing, type AppLocale } from "@/i18n/routing";

const PROVIDERS = new Set(["google", "apple"]);

function isLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ detail: "Unknown sign-in provider" }, { status: 404 });
  }

  const url = new URL(req.url);
  const returnToRaw = url.searchParams.get("return_to") || "/dashboard";
  const returnTo =
    returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/dashboard";
  const localeRaw = url.searchParams.get("locale") || routing.defaultLocale;
  const locale: AppLocale = isLocale(localeRaw) ? localeRaw : routing.defaultLocale;

  console.log(`[oauth/${provider}/start] return_to=${returnTo} locale=${locale}`);

  try {
    const upstream = await fetchInternal(
      `/api/v1/auth/oauth/${provider}/start?return_to=${encodeURIComponent(returnTo)}`,
    );
    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error(`[oauth/${provider}/start] backend status=${upstream.status}`, data);
      const login = new URL(`/${locale}/login`, req.url);
      login.searchParams.set("oauth_error", upstream.status === 503 ? "unavailable" : "failed");
      return NextResponse.redirect(login);
    }

    const authorizeUrl = (data as { authorize_url?: string }).authorize_url;
    if (!authorizeUrl) {
      console.error(`[oauth/${provider}/start] missing authorize_url`);
      const login = new URL(`/${locale}/login`, req.url);
      login.searchParams.set("oauth_error", "failed");
      return NextResponse.redirect(login);
    }

    console.log(`[oauth/${provider}/start] redirecting to provider`);
    const res = NextResponse.redirect(authorizeUrl);
    res.cookies.set("oauth_locale", locale, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    console.error(`[oauth/${provider}/start] error`, e);
    const res = handleProxyError(e);
    const login = new URL(`/${locale}/login`, req.url);
    login.searchParams.set("oauth_error", "failed");
    return NextResponse.redirect(login);
  }
}
