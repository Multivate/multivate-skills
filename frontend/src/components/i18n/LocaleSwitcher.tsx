"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const localeOptions: { value: AppLocale; labelKey: "en" | "fr" | "de" | "es" }[] = [
  { value: "en", labelKey: "en" },
  { value: "fr", labelKey: "fr" },
  { value: "de", labelKey: "de" },
  { value: "es", labelKey: "es" },
];

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("localeSwitcher");
  const tNames = useTranslations("localeNames");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Globe className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={2} aria-hidden />
      <span className="sr-only">{t("label")}</span>
      <select
        className="max-w-[10.5rem] cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-7 text-xs font-semibold text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 sm:text-sm"
        value={locale}
        aria-label={t("label")}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          if (!routing.locales.includes(next)) return;
          router.replace(pathname, { locale: next });
          router.refresh();
        }}
      >
        {localeOptions.map(({ value, labelKey }) => (
          <option key={value} value={value}>
            {tNames(labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
