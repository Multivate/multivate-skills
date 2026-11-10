import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl, getSiteUrl, hreflangLanguages } from "@/lib/site-url";

export const SITE_NAME = "Multivate";
export const SITE_LEGAL_NAME = "Multivate Technological Services & Consultancy Limited";
export const SITE_EMAIL = "info@multivate.com.ng";

export function encodedAssetPath(path: string): string {
  return path
    .split("/")
    .map((segment, index) => (index === 0 ? "" : encodeURIComponent(segment)))
    .join("/");
}

export const DEFAULT_OG_IMAGE = encodedAssetPath("/MULTIVATE MAIN LOGO.png");

export function truncateMeta(text: string, max = 158): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export function brandedTitle(title: string): string {
  const stripped = title.replace(/\s*[|\-–.]\s*Multivate\s*$/i, "").trim();
  if (!stripped || stripped.toLowerCase() === SITE_NAME.toLowerCase()) return SITE_NAME;
  return `${stripped} | ${SITE_NAME}`;
}

const PRIVATE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false, noimageindex: true },
};

export function privateRobotsMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description: description ? truncateMeta(description) : undefined,
    robots: PRIVATE_ROBOTS,
  };
}

export function publicPageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = "website",
  index = true,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  index?: boolean;
}): Metadata {
  const canonical = absoluteUrl(locale, path);
  const ogImage = image || `${getSiteUrl()}${encodedAssetPath(DEFAULT_OG_IMAGE)}`;
  const desc = truncateMeta(description);
  const fullTitle = brandedTitle(title);
  return {
    title: { absolute: fullTitle },
    description: desc,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_LEGAL_NAME,
    publisher: SITE_LEGAL_NAME,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical,
      languages: hreflangLanguages(path),
    },
    robots: index
      ? { index: true, follow: true }
      : PRIVATE_ROBOTS,
    openGraph: {
      type,
      locale: ogLocale(locale),
      alternateLocale: routing.locales.filter((item) => item !== locale).map(ogLocale),
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description: desc,
      images: [{ url: ogImage, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      images: [ogImage],
    },
  };
}

function ogLocale(locale: string): string {
  if (locale === "en") return "en_NG";
  if (locale === "fr") return "fr_FR";
  if (locale === "de") return "de_DE";
  if (locale === "es") return "es_ES";
  return locale;
}
