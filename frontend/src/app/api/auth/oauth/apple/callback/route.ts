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
  const errorPath = errorPathFromCookie(req);
  const form = await req.formData();
  const providerError = form.get("error")?.toString();

  if (providerError) {
    console.warn("[oauth/apple/callback] provider returned error", providerError);
    return oauthErrorRedirect(
      req,
      locale,
      providerError === "user_cancelled_authorize" ? "cancelled" : "failed",
      errorPath,
    );
  }

  const code = form.get("code")?.toString();
  const state = form.get("state")?.toString();
  if (!code || !state) {
    console.warn("[oauth/apple/callback] missing code or state");
    return oauthErrorRedirect(req, locale, "failed", errorPath);
  }

  const name = parseAppleName(form.get("user")?.toString() ?? null);
  return completeOAuthSignIn("apple", { code, state, name }, req);
}
