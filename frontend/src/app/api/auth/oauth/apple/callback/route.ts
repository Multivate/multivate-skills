import { NextResponse } from "next/server";
import { completeOAuthSignIn } from "@/app/api/auth/oauth/_oauthComplete";
import { routing, type AppLocale } from "@/i18n/routing";

function localeFromCookie(req: Request): AppLocale {
  const match = req.headers.get("cookie")?.match(/(?:^|;\s*)oauth_locale=([^;]+)/);
  const raw = match?.[1] ? decodeURIComponent(match[1]) : routing.defaultLocale;
  return (routing.locales as readonly string[]).includes(raw) ? (raw as AppLocale) : routing.defaultLocale;
}

function parseAppleName(raw: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as {
      name?: { firstName?: string; lastName?: string; familyName?: string };
    };
    const first = parsed.name?.firstName?.trim() || "";
    const last = (parsed.name?.lastName || parsed.name?.familyName || "").trim();
    const full = `${first} ${last}`.trim();
    return full || undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  const locale = localeFromCookie(req);
  const form = await req.formData();
  const providerError = form.get("error")?.toString();

  if (providerError) {
    console.warn("[oauth/apple/callback] provider returned error", providerError);
    const login = new URL(`/${locale}/login`, req.url);
    login.searchParams.set("oauth_error", providerError === "user_cancelled_authorize" ? "cancelled" : "failed");
    return NextResponse.redirect(login);
  }

  const code = form.get("code")?.toString();
  const state = form.get("state")?.toString();
  if (!code || !state) {
    console.warn("[oauth/apple/callback] missing code or state");
    const login = new URL(`/${locale}/login`, req.url);
    login.searchParams.set("oauth_error", "failed");
    return NextResponse.redirect(login);
  }

  const name = parseAppleName(form.get("user")?.toString() ?? null);
  return completeOAuthSignIn("apple", { code, state, name }, req);
}
