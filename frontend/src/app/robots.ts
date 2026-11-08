import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/admin",
  "/instructor",
  "/learn",
  "/login",
  "/register",
  "/forgot-password",
];

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  const disallow = [
    "/api/",
    ...routing.locales.flatMap((locale) => PRIVATE_PREFIXES.map((prefix) => `/${locale}${prefix}`)),
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
