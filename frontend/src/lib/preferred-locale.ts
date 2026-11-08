import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

export async function persistPreferredLocale(next: AppLocale) {
  if (!routing.locales.includes(next)) return;
  await fetch("/api/auth/me", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferred_locale: next }),
  }).catch(() => undefined);
}
