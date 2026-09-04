"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./LogoMark";
import { SiteHeaderCart } from "./SiteHeaderCart";
import { SiteHeaderSearch } from "./SiteHeaderSearch";

type SiteHeaderProps = {
  /** Overlays the first viewport (home hero). */
  overlay?: boolean;
};

export function SiteHeader({ overlay = false }: SiteHeaderProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const navLinks = [
    { href: "/courses", label: t("courses") },
    { href: "/mentors", label: t("mentors") },
    { href: "/#teach", label: t("teach") },
    { href: "/#about", label: t("about") },
  ] as const;

  const floating = overlay && !scrolled && !open;
  const shell = overlay
    ? `fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        floating
          ? "border-b border-transparent bg-transparent"
          : "border-b border-brand-ink/10 bg-brand-paper/95 backdrop-blur-md"
      }`
    : "sticky top-0 z-50 border-b border-brand-ink/10 bg-brand-paper/95 backdrop-blur-md";

  const linkClass = floating
    ? "text-sm font-medium text-white/80 transition hover:text-white"
    : "text-sm font-medium text-brand-ink/70 transition hover:text-brand-ink";

  const signInClass = floating
    ? "text-sm font-semibold text-white/90 transition hover:text-white"
    : "text-sm font-semibold text-brand-ink transition hover:text-brand-accent";

  return (
    <header className={shell}>
      <div className="container-page flex h-[4.25rem] items-center gap-3 lg:h-[4.75rem]">
        <Link href="/" className="flex shrink-0 items-center py-1" aria-label={t("homeAria")}>
          <LogoMark
            variant={floating ? "inverse" : "default"}
            className="max-w-[9.5rem] sm:max-w-[11rem]"
            priority
          />
        </Link>

        <SiteHeaderSearch
          className={`hidden shrink-0 md:block ${floating ? "[&_input]:border-white/25 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-white/55" : ""}`}
        />

        <nav className="hidden min-w-0 flex-1 lg:flex lg:justify-center">
          <div className="flex items-center gap-7">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <SiteHeaderCart />
          <LocaleSwitcher className={`hidden sm:inline-flex ${floating ? "text-white" : ""}`} />
          <div className="hidden items-center gap-4 lg:flex">
            <Link href="/login" className={signInClass}>
              {tCommon("signIn")}
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-accent-dark"
            >
              {tCommon("getStarted")}
            </Link>
          </div>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-md border lg:hidden ${
              floating
                ? "border-white/30 text-white"
                : "border-brand-ink/15 text-brand-ink"
            }`}
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-brand-ink/10 bg-brand-paper px-4 py-5 lg:hidden">
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
                className="rounded-md px-3 py-3 text-sm font-medium text-brand-ink hover:bg-brand-muted"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-md px-3 py-3 text-sm font-semibold text-brand-ink hover:bg-brand-muted"
              onClick={() => setOpen(false)}
            >
              {tCommon("signIn")}
            </Link>
            <Link
              href="/register"
              className="btn-primary-brand mt-3 w-full"
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
