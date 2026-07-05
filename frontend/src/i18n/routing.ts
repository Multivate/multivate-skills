import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr", "de", "es"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

export function pathnameWithoutLeadingLocale(pathname: string): string {
  const pattern = new RegExp(`^\\/(${routing.locales.join("|")})(?=\\/|$)`);
  const stripped = pathname.replace(pattern, "");
  if (!stripped || stripped === "/") return "/";
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}
