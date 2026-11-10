"use client";

import { Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  DeskLocaleChips,
  DeskMobileSection,
  DeskProfileMenu,
  DeskProfileSection,
  deskFlyoutLink,
} from "@/components/dashboard/DeskProfileMenu";
import { MentorSiteFooter } from "@/components/dashboard/MentorSiteFooter";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { AppearanceMenu } from "@/components/theme/AppearanceMenu";
import { LogoMark } from "@/components/layout/LogoMark";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/auth-context";
import { Link, usePathname } from "@/i18n/navigation";
import { hardNavigate } from "@/lib/auth-navigation";

const flyoutLink = deskFlyoutLink;

export function MentorShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();
  const tDash = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open, menuScrollRef);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!user) return null;

  const navLink = (active: boolean) =>
    `inline-flex items-center py-2 text-[15px] font-medium transition duration-200 ${
      active ? "text-brand-accent" : "text-[#011B33] hover:text-brand-accent dark:text-[#eef4ff] dark:hover:text-brand-accent"
    }`;

  return (
    <div className="desk-root flex min-h-screen flex-col bg-white text-[#011B33] dark:bg-[#070e22] dark:text-[#eef4ff]">
      <header className="desk-topbar sticky top-0 z-50 isolate border-b border-brand-ink/10 dark:border-white/10">
        <div className="mx-auto flex h-[4.25rem] max-w-[84rem] items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="shrink-0" aria-label="Multivate home">
            <LogoMark className="max-w-[8.5rem] sm:max-w-[10rem]" />
          </Link>
          <nav className="ml-auto hidden items-center gap-5 lg:flex" aria-label={tDash("shell.mainNav")}>
            <Link href="/dashboard" className={navLink(pathname === "/dashboard")}>
              {tDash("nav.mentor.home")}
            </Link>
            <Link href="/dashboard/mentor/profile" className={navLink(pathname.startsWith("/dashboard/mentor/profile"))}>
              {tDash("nav.mentor.profile")}
            </Link>
            <Link href="/dashboard/mentor/messages" className={navLink(pathname.startsWith("/dashboard/mentor/messages"))}>
              {tDash("nav.mentor.messages")}
            </Link>
            <Link href="/mentors" className={navLink(pathname.startsWith("/mentors"))}>
              {tNav("mentors")}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-3">
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
              <DeskProfileSection title="Workspace">
                <Link href="/dashboard" className={flyoutLink}>
                  {tDash("nav.mentor.home")}
                </Link>
                <Link href="/dashboard/mentor/profile" className={flyoutLink}>
                  {tDash("nav.mentor.profile")}
                </Link>
                <Link href="/dashboard/mentor/messages" className={flyoutLink}>
                  {tDash("nav.mentor.messages")}
                </Link>
              </DeskProfileSection>
              <DeskProfileSection title="Discover">
                <Link href="/mentors" className={flyoutLink}>
                  {tNav("mentors")}
                </Link>
              </DeskProfileSection>
              <DeskProfileSection title="Account">
                <Link href="/dashboard/settings" className={flyoutLink}>
                  {tDash("nav.mentor.settings")}
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-brand-ink/15 lg:hidden"
              aria-label={open ? tDash("shell.closeMenu") : tDash("shell.openMenu")}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open ? (
          <>
          <div className="fixed inset-0 top-[4.25rem] z-40 bg-[#10244F]/20 lg:hidden" onClick={() => setOpen(false)} />
          <div
            ref={menuScrollRef}
            className="desk-sheet fixed inset-x-0 bottom-0 top-[4.25rem] z-50 overflow-y-auto overscroll-contain border-t border-brand-ink/10 px-4 py-3 pb-[env(safe-area-inset-bottom)] dark:border-white/10 lg:hidden"
          >
            <DeskMobileSection title="Workspace">
              <Link href="/dashboard" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.mentor.home")}
              </Link>
              <Link href="/dashboard/mentor/profile" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.mentor.profile")}
              </Link>
              <Link href="/dashboard/mentor/messages" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.mentor.messages")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Discover">
              <Link href="/mentors" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tNav("mentors")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Account">
              <Link href="/dashboard/settings" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.mentor.settings")}
              </Link>
              <Link href="/dashboard/profile" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.publicProfile")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Support">
              <Link href="/dashboard/support" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.helpSupport")}
              </Link>
            </DeskMobileSection>
          </div>
          </>
        ) : null}
      </header>
      <main className="w-full flex-1">{children}</main>
      <MentorSiteFooter />
    </div>
  );
}
