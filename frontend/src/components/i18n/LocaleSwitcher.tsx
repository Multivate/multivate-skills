"use client";

import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const menuPanel =
  "pointer-events-none absolute right-0 top-full z-50 min-w-[11rem] pt-2 opacity-0 translate-y-1 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100";

const localeOptions: { value: AppLocale; labelKey: "en" | "fr" | "de" | "es"; flag: "gb" | "fr" | "de" | "es" }[] = [
  { value: "en", labelKey: "en", flag: "gb" },
  { value: "fr", labelKey: "fr", flag: "fr" },
  { value: "de", labelKey: "de", flag: "de" },
  { value: "es", labelKey: "es", flag: "es" },
];

function CountryFlag({ code }: { code: "gb" | "fr" | "de" | "es" }) {
  const className = "h-3 w-4 shrink-0 overflow-hidden rounded-[4px]";
  if (code === "fr") {
    return (
      <svg viewBox="0 0 3 2" className={className} aria-hidden>
        <rect width="1" height="2" fill="#002395" />
        <rect x="1" width="1" height="2" fill="#fff" />
        <rect x="2" width="1" height="2" fill="#ED2939" />
      </svg>
    );
  }
  if (code === "de") {
    return (
      <svg viewBox="0 0 5 3" className={className} aria-hidden>
        <rect width="5" height="1" fill="#000" />
        <rect y="1" width="5" height="1" fill="#DD0000" />
        <rect y="2" width="5" height="1" fill="#FFCE00" />
      </svg>
    );
  }
  if (code === "es") {
    return (
      <svg viewBox="0 0 3 2" className={className} aria-hidden>
        <rect width="3" height="2" fill="#AA151B" />
        <rect y="0.5" width="3" height="1" fill="#F1BF00" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden>
      <path d="M0,0 h60 v30 h-60 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("localeSwitcher");
  const tNames = useTranslations("localeNames");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open, undefined, "events");
  const current = localeOptions.find((option) => option.value === locale) ?? localeOptions[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: AppLocale) {
    setOpen(false);
    if (next === locale || !routing.locales.includes(next)) return;
    router.replace(pathname, { locale: next });
    router.refresh();
  }

  return (
    <div
      ref={rootRef}
      className={`group relative ${className ?? ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-[5px] py-2 text-[15px] font-medium text-[#011B33] transition duration-200 hover:text-brand-accent"
        aria-label={t("label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <CountryFlag code={current.flag} />
        <span className="hidden xl:inline">{tNames(current.labelKey)}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <div className={`${menuPanel} ${open ? "pointer-events-auto translate-y-0 opacity-100" : ""}`}>
        <ul
          role="listbox"
          aria-label={t("label")}
          className="overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white py-1 shadow-[0_8px_24px_rgba(12,27,74,0.12)]"
        >
          {localeOptions.map((option) => {
            const selected = option.value === locale;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-[#011B33] transition duration-200 hover:bg-brand-sky hover:text-brand-accent ${
                    selected ? "bg-brand-sky" : ""
                  }`}
                  onClick={() => choose(option.value)}
                >
                  <CountryFlag code={option.flag} />
                  {tNames(option.labelKey)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
