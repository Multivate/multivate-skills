"use client";

import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  DeskLocaleChips,
  DeskMobileSection,
  DeskProfileMenu,
  DeskProfileSection,
  deskFlyoutLink,
} from "@/components/dashboard/DeskProfileMenu";
import { InstructorSiteFooter } from "@/components/dashboard/InstructorSiteFooter";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { AppearanceMenu } from "@/components/theme/AppearanceMenu";
import { LogoMark } from "@/components/layout/LogoMark";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/auth-context";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { hardNavigate } from "@/lib/auth-navigation";

const flyout =
  "pointer-events-none absolute right-0 top-full z-50 min-w-[15rem] pt-2 opacity-0 translate-y-1.5 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100";

const flyoutCard =
  "max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain rounded-[5px] border border-brand-ink/10 bg-white py-1 shadow-[0_12px_28px_rgba(16,36,79,0.14)] dark:border-white/10 dark:bg-[#10192f]";

const flyoutLink = deskFlyoutLink;

function HoverMenu({
  trigger,
  children,
  align = "right",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="group relative">
      {trigger}
      <div className={`${flyout} ${align === "left" ? "left-0 right-auto" : ""}`}>
        <div className={flyoutCard}>{children}</div>
      </div>
    </div>
  );
}

export function InstructorShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const tDash = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const ti = (id: string) => tDash(`nav.instructor.${id}`);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!user) return null;

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/instructor/studio?q=${encodeURIComponent(trimmed)}` : "/instructor/studio");
  }

  const navLink = (active: boolean) =>
    `inline-flex items-center py-2 text-[15px] font-medium transition duration-200 ${
      active ? "text-brand-accent" : "text-[#011B33] hover:text-brand-accent dark:text-[#eef4ff] dark:hover:text-brand-accent"
    }`;

  return (
    <div className="desk-root flex min-h-screen flex-col bg-white text-[#011B33] dark:bg-[#070e22] dark:text-[#eef4ff]">
      <header className="sticky top-0 z-50 border-b border-brand-ink/10 bg-brand-sky dark:border-white/10 dark:bg-[#0c1833]">
        <div className="mx-auto flex h-[4.25rem] max-w-[84rem] items-center gap-3 px-4 sm:gap-5 sm:px-6">
          <Link href="/instructor" className="shrink-0" aria-label="Multivate home">
            <LogoMark className="max-w-[8.5rem] sm:max-w-[10rem]" />
          </Link>
          <form onSubmit={onSearch} className="relative hidden min-w-0 flex-1 md:block" role="search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tDash("shell.searchInstructorPh")}
              className="h-11 w-full rounded-[5px] border border-brand-ink/15 bg-white pl-11 pr-4 text-sm outline-none transition duration-200 focus:border-brand-accent"
            />
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#011B33]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </form>
          <nav className="ml-auto hidden items-center gap-4 xl:flex" aria-label={tDash("shell.mainNav")}>
            <Link href="/instructor" className={navLink(pathname === "/instructor")}>
              {ti("home")}
            </Link>
            <HoverMenu
              align="left"
              trigger={
                <Link href="/instructor/studio" className={navLink(pathname.startsWith("/instructor/studio"))}>
                  {ti("courseStudio")}
                </Link>
              }
            >
              <Link href="/instructor/studio" className={flyoutLink}>
                {ti("courseStudio")}
              </Link>
              <Link href="/instructor/studio/new" className={flyoutLink}>
                {ti("createCourse")}
              </Link>
            </HoverMenu>
            <Link href="/instructor/students" className={navLink(pathname.startsWith("/instructor/students"))}>
              {ti("students")}
            </Link>
            <Link href="/instructor/reviews" className={navLink(pathname.startsWith("/instructor/reviews"))}>
              {ti("reviews")}
            </Link>
            <HoverMenu
              trigger={
                <Link
                  href="/instructor/analytics"
                  className={navLink(
                    pathname.startsWith("/instructor/analytics") ||
                      pathname.startsWith("/instructor/earnings") ||
                      pathname.startsWith("/dashboard/payments"),
                  )}
                >
                  {tDash("navGroups.instructor.insights")}
                </Link>
              }
            >
              <Link href="/instructor/analytics" className={flyoutLink}>
                {ti("analytics")}
              </Link>
              <Link href="/instructor/earnings" className={flyoutLink}>
                {ti("earnings")}
              </Link>
              <Link href="/dashboard/payments" className={flyoutLink}>
                {ti("billing")}
              </Link>
            </HoverMenu>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/instructor/studio/new"
              className="hidden h-10 items-center rounded-[5px] bg-brand-accent px-4 text-sm font-semibold text-white hover:bg-[#0f4bb8] lg:inline-flex"
            >
              New course
            </Link>
            <AppearanceMenu />
            <NotificationBell
              label={tDash("shell.notifications")}
              buttonClassName="relative flex h-10 w-10 items-center justify-center rounded-[5px] text-[#011B33] transition duration-200 hover:bg-white/70 hover:text-brand-accent dark:text-[#eef4ff] dark:hover:bg-white/10"
            />
            <DeskProfileMenu
              trigger={
                <button type="button" className="rounded-full p-0.5" aria-label={user.name}>
                  <PersonMark name={user.name} className="h-8 w-8 text-[11px]" />
                </button>
              }
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <PersonMark name={user.name} className="h-10 w-10 text-[12px]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-xs text-[#011B33]/60 dark:text-[#eef4ff]/55">{user.email}</p>
                </div>
              </div>
              <DeskProfileSection title="Teach">
                <Link href="/instructor" className={flyoutLink}>
                  {ti("home")}
                </Link>
                <Link href="/instructor/studio" className={flyoutLink}>
                  {ti("courseStudio")}
                </Link>
                <Link href="/instructor/studio/new" className={flyoutLink}>
                  {ti("createCourse")}
                </Link>
                <Link href="/courses" className={flyoutLink}>
                  {tNav("courses")}
                </Link>
              </DeskProfileSection>
              <DeskProfileSection title="Audience">
                <Link href="/instructor/students" className={flyoutLink}>
                  {ti("students")}
                </Link>
                <Link href="/instructor/reviews" className={flyoutLink}>
                  {ti("reviews")}
                </Link>
                <Link href="/dashboard/messages" className={flyoutLink}>
                  {ti("messages")}
                </Link>
              </DeskProfileSection>
              <DeskProfileSection title="Insights">
                <Link href="/instructor/analytics" className={flyoutLink}>
                  {ti("analytics")}
                </Link>
                <Link href="/instructor/earnings" className={flyoutLink}>
                  {ti("earnings")}
                </Link>
                <Link href="/dashboard/payments" className={flyoutLink}>
                  {ti("billing")}
                </Link>
              </DeskProfileSection>
              <DeskProfileSection title="Account">
                <Link href="/dashboard/settings" className={flyoutLink}>
                  {ti("settings")}
                </Link>
                <Link href="/dashboard/profile" className={flyoutLink}>
                  {tDash("nav.student.publicProfile")}
                </Link>
                <DeskLocaleChips />
              </DeskProfileSection>
              <DeskProfileSection title="Support">
                <Link href="/dashboard/support" className={flyoutLink}>
                  {tDash("nav.student.helpSupport")}
                </Link>
              </DeskProfileSection>
              <div className="border-t border-brand-ink/10 dark:border-white/10" />
              <button
                type="button"
                className={`${flyoutLink} w-full text-left`}
                onClick={() => {
                  void logout().then(() => hardNavigate("/", locale));
                }}
              >
                {tDash("shell.logOut")}
              </button>
            </DeskProfileMenu>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-brand-ink/15 xl:hidden"
              aria-label={open ? tDash("shell.closeMenu") : tDash("shell.openMenu")}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open ? (
          <div className="border-t border-brand-ink/10 px-4 py-3 xl:hidden">
            <form onSubmit={onSearch} className="mb-2 md:hidden" role="search">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tDash("shell.searchInstructorPh")}
                className="h-11 w-full rounded-[5px] border border-brand-ink/15 bg-white px-3 text-sm outline-none focus:border-brand-accent"
              />
            </form>
            <DeskMobileSection title="Teach">
              <Link href="/instructor" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("home")}
              </Link>
              <Link href="/instructor/studio" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("courseStudio")}
              </Link>
              <Link href="/instructor/studio/new" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("createCourse")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Audience">
              <Link href="/instructor/students" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("students")}
              </Link>
              <Link href="/instructor/reviews" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("reviews")}
              </Link>
              <Link href="/dashboard/messages" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("messages")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Insights">
              <Link href="/instructor/analytics" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("analytics")}
              </Link>
              <Link href="/instructor/earnings" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("earnings")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Account">
              <Link href="/dashboard/settings" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {ti("settings")}
              </Link>
            </DeskMobileSection>
          </div>
        ) : null}
      </header>
      <main className="w-full flex-1">{children}</main>
      <InstructorSiteFooter />
    </div>
  );
}
