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
    <label className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <Globe className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" strokeWidth={2} aria-hidden />
      <span className="sr-only">{t("label")}</span>
      <select
        className="max-w-[6.75rem] cursor-pointer rounded-md border border-neutral-200 bg-brand-surface py-1 pl-1.5 pr-5 text-[11px] font-semibold leading-tight text-zinc-800 shadow-none outline-none transition hover:border-neutral-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 dark:border-neutral-500 dark:bg-zinc-900 dark:text-neutral-100 dark:hover:border-neutral-500 sm:max-w-[7.5rem]"
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
