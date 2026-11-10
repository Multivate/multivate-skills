import { routing, type AppLocale } from "@/i18n/routing";

export const DEFAULT_SITE_URL = "https://multivate.com.ng";

export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function localizedPath(locale: string, pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") return `/${locale}`;
  return `/${locale}${path}`;
}

export function absoluteUrl(locale: string, pathname: string): string {
  return `${getSiteUrl()}${localizedPath(locale, pathname)}`;
}

export function absoluteAssetUrl(pathOrUrl: string | null | undefined): string | undefined {
  const value = (pathOrUrl || "").trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) {
    const encoded = value
      .split("/")
      .map((segment, index) => (index === 0 ? "" : encodeURIComponent(segment)))
      .join("/");
    return `${getSiteUrl()}${encoded}`;
  }
  return undefined;
}

export function hreflangLanguages(pathname: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(locale, pathname);
  }
  languages["x-default"] = absoluteUrl(routing.defaultLocale, pathname);
  return languages;
}

export function isAppLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}
