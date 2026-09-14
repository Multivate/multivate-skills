import { completeOAuthSignIn } from "@/app/api/auth/oauth/_oauthComplete";
import { oauthErrorRedirect, resolveLocale } from "@/app/api/auth/oauth/_oauthRedirect";
import { routing, type AppLocale } from "@/i18n/routing";

function localeFromCookie(req: Request): AppLocale {
  const match = req.headers.get("cookie")?.match(/(?:^|;\s*)oauth_locale=([^;]+)/);
  const raw = match?.[1] ? decodeURIComponent(match[1]) : routing.defaultLocale;
  return resolveLocale(raw);
}

function errorPathFromCookie(req: Request): string {
  const match = req.headers.get("cookie")?.match(/(?:^|;\s*)oauth_error_path=([^;]+)/);
  const raw = match?.[1] ? decodeURIComponent(match[1]) : "/login";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/login";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = localeFromCookie(req);
  const errorPath = errorPathFromCookie(req);
  const providerError = url.searchParams.get("error");

  if (providerError) {
    console.warn("[oauth/google/callback] provider returned error", providerError);
    return oauthErrorRedirect(
      req,
      locale,
      providerError === "access_denied" ? "cancelled" : "failed",
      errorPath,
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    console.warn("[oauth/google/callback] missing code or state");
    return oauthErrorRedirect(req, locale, "failed", errorPath);
  }

  return completeOAuthSignIn("google", { code, state }, req);
}
