"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./LogoMark";
import { SiteHeaderCart } from "./SiteHeaderCart";
import { SiteHeaderSearch } from "./SiteHeaderSearch";

export function SiteHeader() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "/#teach", label: t("teach") },
    { href: "/courses", label: t("courses") },
    { href: "#german", label: t("german") },
    { href: "#organizations", label: t("organizations") },
    { href: "#about", label: t("about") },
    { href: "#resources", label: t("resources"), hasChevron: true },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/98 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-950/95 dark:backdrop-blur-md">
      <div className="container-page relative flex h-[4.25rem] items-center gap-3 lg:h-[4.5rem]">
        <Link
          href="/"
          className="relative z-10 flex shrink-0 items-center py-1"
          aria-label={t("homeAria")}
        >
          <LogoMark className="max-w-[9.5rem] sm:max-w-[11rem]" priority />
        </Link>

        <SiteHeaderSearch className="hidden min-w-0 flex-1 md:block lg:max-w-xs lg:flex-none" />

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 xl:flex xl:gap-7">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex items-center gap-1 whitespace-nowrap text-[0.8125rem] font-medium text-slate-600 transition hover:text-brand-primary dark:text-slate-300 dark:hover:text-violet-300"
            >
              {l.label}
              {"hasChevron" in l && l.hasChevron ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-50" aria-hidden />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="relative z-10 ml-auto flex items-center gap-2 sm:gap-3 lg:gap-4">
          <SiteHeaderCart />
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <div className="hidden items-center gap-5 lg:flex lg:gap-6">
            <Link
              href="/login"
              className="text-[0.8125rem] font-semibold text-slate-700 transition hover:text-brand-primary dark:text-slate-200 dark:hover:text-violet-300"
            >
              {tCommon("signIn")}
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-brand-primary px-5 py-2.5 text-[0.8125rem] font-semibold text-white shadow-sm transition hover:bg-brand-primary-dark lg:px-6"
            >
              {tCommon("getStarted")}
            </Link>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-100 xl:hidden"
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 xl:hidden">
          <div className="mb-4 md:hidden">
            <SiteHeaderSearch className="w-full [&_input]:w-full" />
          </div>
          <div className="mb-4 px-1">
            <LocaleSwitcher />
          </div>
          <nav className="flex flex-col gap-0.5">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                onClick={() => setOpen(false)}
              >
                {l.label}
                {"hasChevron" in l && l.hasChevron ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : null}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-900"
              onClick={() => setOpen(false)}
            >
              {tCommon("signIn")}
            </Link>
            <Link
              href="/register"
              className="btn-primary-brand mt-3 w-full !rounded-xl"
              onClick={() => setOpen(false)}
            >
              {tCommon("getStarted")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
