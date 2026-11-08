"use client";

import { useLocale } from "next-intl";
import { type ReactNode } from "react";
import { persistPreferredLocale } from "@/lib/preferred-locale";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export const deskFlyoutLink =
  "block px-4 py-2 text-sm font-medium text-[#011B33] transition duration-200 hover:bg-brand-sky hover:text-brand-accent dark:text-[#eef4ff] dark:hover:bg-white/10";

const flyout =
  "pointer-events-none absolute right-0 top-full z-50 min-w-[16.5rem] pt-2 opacity-0 translate-y-1.5 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100";

export function DeskProfileMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  return (
    <div className="group relative">
      {trigger}
      <div className={flyout}>
        <div
          className="max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain rounded-[5px] border border-brand-ink/10 bg-white py-1 shadow-[0_12px_28px_rgba(16,36,79,0.14)] [scrollbar-gutter:stable] dark:border-white/10 dark:bg-[#10192f]"
          onWheel={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function DeskProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-brand-ink/10 dark:border-white/10">
      <p className="px-4 pb-0.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#011B33]/40 dark:text-[#eef4ff]/40">
        {title}
      </p>
      {children}
    </div>
  );
}

export function DeskMobileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-brand-ink/10 py-1 first:border-t-0 dark:border-white/10">
      <p className="px-0 pb-0.5 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#011B33]/40 dark:text-[#eef4ff]/40">
        {title}
      </p>
      {children}
    </div>
  );
}

export function DeskLocaleChips() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="px-4 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#011B33]/40 dark:text-[#eef4ff]/40">Language</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {routing.locales.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              className={`rounded-[5px] px-2 py-1 text-xs font-semibold uppercase ${
                active
                  ? "bg-brand-accent text-white"
                  : "bg-brand-sky text-[#011B33] hover:bg-brand-sky/80 dark:bg-white/10 dark:text-[#eef4ff] dark:hover:bg-white/15"
              }`}
              onClick={() => {
                const next = code as AppLocale;
                void persistPreferredLocale(next);
                if (next !== locale) {
                  router.replace(pathname, { locale: next });
                  router.refresh();
                }
              }}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
