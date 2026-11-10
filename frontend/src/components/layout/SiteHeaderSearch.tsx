"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function SiteHeaderSearch({
  className = "",
  inputId = "site-header-search",
  variant = "header",
}: {
  className?: string;
  inputId?: string;
  variant?: "header" | "hero";
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("search") ?? "");

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
      <label htmlFor={inputId} className="sr-only">
        {t("searchLabel")}
      </label>
      <Search
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-brand-ink/45 ${variant === "hero" ? "left-4 h-5 w-5" : "left-2.5 h-3.5 w-3.5"}`}
        strokeWidth={2}
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        autoComplete="off"
        className={
          variant === "hero"
            ? "h-[50px] w-full rounded-[5px] border border-brand-ink/15 bg-white py-2 pl-12 pr-4 text-base text-brand-ink outline-none transition duration-200 placeholder:text-brand-ink/40 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
            : "h-9 w-full rounded-md border border-brand-ink/15 bg-white py-1.5 pl-8 pr-2.5 text-[13px] text-brand-ink outline-none transition duration-200 placeholder:text-brand-ink/40 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
        }
      />
    </form>
  );
}
