"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FormEvent, useState } from "react";

export function SiteHeaderSearch({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) {
      router.push("/courses");
      return;
    }
    router.push(`/courses?search=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`relative ${className}`}
      role="search"
      aria-label={t("searchAria")}
    >
      <label htmlFor="site-header-search" className="sr-only">
        {t("searchLabel")}
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} aria-hidden />
      <input
        id="site-header-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        autoComplete="off"
        className="h-9 w-[min(100%,11rem)] rounded-lg border border-slate-200 bg-slate-50/90 py-1.5 pl-8 pr-2 text-xs text-brand-ink outline-none transition placeholder:text-slate-400 focus:border-brand-panel focus:ring-2 focus:ring-brand-panel/20 sm:w-44 dark:border-slate-700 dark:bg-slate-900/80"
      />
    </form>
  );
}
