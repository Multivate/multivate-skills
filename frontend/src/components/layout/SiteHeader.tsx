"use client";

import { BookOpen, ChevronDown, GraduationCap, Info, Menu, Users, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { LogoMark } from "./LogoMark";
import { SiteHeaderCart } from "./SiteHeaderCart";
import { SiteHeaderSearch } from "./SiteHeaderSearch";

const menuPanel =
  "pointer-events-none absolute left-0 top-full z-50 min-w-[13.5rem] pt-2 opacity-0 translate-y-1 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100";

function NavMenu({
  href,
  label,
  icon: Icon,
  items,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  items: { href: string; label: string }[];
}) {
  const [hover, setHover] = useState(false);
  useBodyScrollLock(hover, undefined, "events");
  return (
    <div
      className="group relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHover(false);
      }}
    >
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 py-2 text-[15px] font-medium text-[#011B33] transition duration-200 hover:text-brand-accent"
      >
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        {label}
        <ChevronDown
          className="h-3.5 w-3.5 transition duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
          strokeWidth={2}
          aria-hidden
        />
      </Link>
      <div className={menuPanel}>
        <ul className="overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white py-1 shadow-[0_8px_24px_rgba(12,27,74,0.12)]">
          {items.map((item) => (
            <li key={item.href + item.label}>
              <Link
                href={item.href}
                className="block px-3 py-2 text-sm font-medium text-[#011B33] transition duration-200 hover:bg-brand-sky hover:text-brand-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open, menuScrollRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tTabs = useTranslations("topCourses.tabs");
  const tTeach = useTranslations("landing.teach");
  const tFooter = useTranslations("footer");

  const menus = [
    {
      href: "/courses",
      label: t("courses"),
      icon: BookOpen,
      items: [
        { href: "/courses", label: tTabs("all") },
        { href: "/courses?search=German", label: tTabs("german") },
        { href: "/courses?search=tech", label: tTabs("web") },
        { href: "/courses?search=data", label: tTabs("data") },
        { href: "/courses?search=career", label: tTabs("career") },
      ],
    },
    {
      href: "/mentors",
      label: t("mentors"),
      icon: Users,
      items: [
        { href: "/mentors", label: t("mentors") },
        { href: "/mentors", label: t("bookMentor") },
      ],
    },
    {
      href: "/#teach",
      label: t("teach"),
      icon: GraduationCap,
      items: [
        { href: "/#teach", label: tTeach("title") },
        { href: "/register?intent=instructor", label: tTeach("ctaInstructor") },
      ],
    },
    {
      href: "/about",
      label: t("about"),
      icon: Info,
      items: [
        { href: "/about", label: t("about") },
        { href: "/about#mission", label: tFooter("coMission") },
        { href: "/contact", label: t("contact") },
        { href: "/privacy", label: tFooter("suPrivacy") },
        { href: "/terms", label: tFooter("suTerms") },
      ],
    },
  ] as const;

  return (
    <header
      className={`desk-topbar sticky top-0 z-50 isolate transition-shadow duration-300 ${
        scrolled ? "shadow-[0_8px_24px_rgba(12,27,74,0.06)]" : ""
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-ink focus:shadow"
      >
        {tCommon("skipToContent")}
      </a>
      <div className="container-page flex h-16 items-center gap-4 lg:h-[4.25rem]">
        <Link href="/" className="flex shrink-0 items-center" aria-label={t("homeAria")}>
          <LogoMark className="max-w-[9.5rem] sm:max-w-[11rem]" priority />
        </Link>

        <nav className="hidden items-center gap-4 lg:flex" aria-label={t("explore")}>
          {menus.map((menu) => (
            <NavMenu key={menu.label} href={menu.href} label={menu.label} icon={menu.icon} items={[...menu.items]} />
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Suspense fallback={<div className="hidden h-9 w-36 lg:block xl:w-44" />}>
            <SiteHeaderSearch className="hidden w-36 shrink-0 lg:block xl:w-44" />
          </Suspense>
          <SiteHeaderCart />
          <LocaleSwitcher className="hidden sm:inline-flex" />
          <Link
            href="/login"
            className="hidden text-[15px] font-medium text-[#011B33] transition-colors duration-200 hover:text-brand-accent lg:inline"
          >
            {tCommon("signIn")}
          </Link>
          <Link href="/register" className="btn-primary-brand hidden h-10 rounded-[5px] px-[18px] text-[15px] font-medium lg:inline-flex">
            {tCommon("getStarted")}
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-ink/15 text-brand-ink lg:hidden"
            aria-expanded={open}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <div className="fixed inset-0 top-16 z-40 bg-[#10244F]/20 lg:hidden" onClick={() => setOpen(false)} />
          <div
            ref={menuScrollRef}
            className="desk-sheet fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto overscroll-contain border-t border-brand-ink/10 px-4 py-4 [-webkit-overflow-scrolling:touch] lg:hidden"
          >
          <Suspense fallback={<div className="mb-4 h-9" />}>
            <SiteHeaderSearch className="mb-4" inputId="site-header-search-menu" />
          </Suspense>
          <div className="mb-3 px-1">
            <LocaleSwitcher />
          </div>
          <nav className="flex flex-col pb-[env(safe-area-inset-bottom)]">
            {menus.map((menu) => (
              <div key={menu.label} className="border-b border-brand-ink/10 py-1 last:border-0">
                <Link
                  href={menu.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-brand-ink"
                  onClick={() => setOpen(false)}
                >
                  <menu.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {menu.label}
                </Link>
                {menu.items.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="block rounded-md py-2 pl-9 pr-3 text-sm text-brand-ink/80 hover:bg-white/70"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <Link
              href="/login"
              className="rounded-md px-3 py-3 text-sm font-semibold text-brand-ink hover:bg-brand-muted"
              onClick={() => setOpen(false)}
            >
              {tCommon("signIn")}
            </Link>
            <Link href="/register" className="btn-primary-brand mt-3 w-full" onClick={() => setOpen(false)}>
              {tCommon("getStarted")}
            </Link>
          </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
