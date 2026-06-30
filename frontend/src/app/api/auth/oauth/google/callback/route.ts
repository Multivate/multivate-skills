import { NextResponse } from "next/server";
import { completeOAuthSignIn } from "@/app/api/auth/oauth/_oauthComplete";
import { routing, type AppLocale } from "@/i18n/routing";

function localeFromCookie(req: Request): AppLocale {
  const match = req.headers.get("cookie")?.match(/(?:^|;\s*)oauth_locale=([^;]+)/);
  const raw = match?.[1] ? decodeURIComponent(match[1]) : routing.defaultLocale;
  return (routing.locales as readonly string[]).includes(raw) ? (raw as AppLocale) : routing.defaultLocale;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = localeFromCookie(req);
  const providerError = url.searchParams.get("error");

  if (providerError) {
    console.warn("[oauth/google/callback] provider returned error", providerError);
    const login = new URL(`/${locale}/login`, req.url);
    login.searchParams.set("oauth_error", providerError === "access_denied" ? "cancelled" : "failed");
    return NextResponse.redirect(login);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    console.warn("[oauth/google/callback] missing code or state");
    const login = new URL(`/${locale}/login`, req.url);
    login.searchParams.set("oauth_error", "failed");
    return NextResponse.redirect(login);
  }

  return completeOAuthSignIn("google", { code, state }, req);
}
