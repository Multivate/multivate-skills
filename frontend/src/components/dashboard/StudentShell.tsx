"use client";

import { Heart, Menu, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  DeskLocaleChips,
  DeskMobileSection,
  DeskProfileMenu,
  DeskProfileSection,
  deskFlyoutLink,
} from "@/components/dashboard/DeskProfileMenu";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { StudentSiteFooter } from "@/components/dashboard/StudentSiteFooter";
import { AppearanceMenu } from "@/components/theme/AppearanceMenu";
import { SiteHeaderCart } from "@/components/layout/SiteHeaderCart";
import { LogoMark } from "@/components/layout/LogoMark";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/auth-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { hardNavigate } from "@/lib/auth-navigation";

const flyout =
  "pointer-events-none absolute right-0 top-full z-50 min-w-[15rem] pt-2 opacity-0 translate-y-1.5 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100";

const flyoutCard =
  "overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white py-1 shadow-[0_12px_28px_rgba(16,36,79,0.14)] dark:border-white/10 dark:bg-[#10192f]";

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

export function StudentShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { items: wishItems, count: wishCount } = useWishlist();
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const tDash = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!user) return null;

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/courses?search=${encodeURIComponent(trimmed)}` : "/courses");
  }

  const navLink = (active: boolean) =>
    `inline-flex items-center py-2 text-[15px] font-medium transition duration-200 ${
      active ? "text-brand-accent" : "text-[#011B33] hover:text-brand-accent dark:text-[#eef4ff] dark:hover:text-brand-accent"
    }`;

  return (
    <div className="desk-root flex min-h-screen flex-col bg-white text-[#011B33] dark:bg-[#070e22] dark:text-[#eef4ff]">
      <header className="sticky top-0 z-50 bg-brand-sky dark:border-b dark:border-white/10 dark:bg-[#0c1833]">
        <div className="mx-auto flex h-[4.25rem] max-w-[84rem] items-center gap-2 overflow-visible px-3 sm:gap-5 sm:px-6">
          <Link href="/dashboard" className="shrink-0" aria-label="Multivate home">
            <LogoMark className="max-w-[8.5rem] sm:max-w-[10rem]" />
          </Link>
          <form onSubmit={onSearch} className="relative hidden min-w-0 flex-1 md:block" role="search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tNav("searchLabel")}
              className="h-11 w-full rounded-[5px] border border-brand-ink/15 bg-white pl-11 pr-4 text-sm outline-none transition duration-200 focus:border-brand-accent"
            />
            <svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#011B33]" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </form>
          <nav className="ml-auto hidden items-center gap-4 lg:flex" aria-label={tDash("shell.mainNav")}>
            <HoverMenu
              align="left"
              trigger={
                <Link href="/courses" className={navLink(pathname.startsWith("/courses"))}>
                  {tNav("explore")}
                </Link>
              }
            >
              <Link href="/courses" className={flyoutLink}>
                All courses
              </Link>
              <Link href="/courses?search=German" className={flyoutLink}>
                German
              </Link>
              <Link href="/courses?search=tech" className={flyoutLink}>
                Technology
              </Link>
              <Link href="/mentors" className={flyoutLink}>
                Mentors
              </Link>
              <Link href="/dashboard/book-1on1" className={flyoutLink}>
                {tDash("nav.student.bookOneOnOne")}
              </Link>
            </HoverMenu>
            <HoverMenu
              trigger={
                <Link href="/dashboard/subscribe" className={navLink(pathname.startsWith("/dashboard/subscribe"))}>
                  {tDash("nav.student.subscribe")}
                </Link>
              }
            >
              <Link href="/dashboard/courses?tab=tools" className={flyoutLink}>
                Weekly learning time
              </Link>
              <Link href="/courses" className={flyoutLink}>
                Browse courses
              </Link>
              <a href="mailto:info@multivate.com.ng" className={flyoutLink}>
                For organizations
              </a>
            </HoverMenu>
            <HoverMenu
              trigger={
                <Link href="/dashboard/courses" className={navLink(pathname.startsWith("/dashboard/courses"))}>
                  {tDash("nav.student.myCourses")}
                </Link>
              }
            >
              <Link href="/dashboard/courses" className={flyoutLink}>
                All courses
              </Link>
              <Link href="/dashboard/courses?tab=lists" className={flyoutLink}>
                {tDash("nav.student.myLists")}
              </Link>
              <Link href="/dashboard/courses?tab=wishlist" className={flyoutLink}>
                {tDash("nav.student.wishlist")}
              </Link>
              <Link href="/dashboard/courses?tab=saved" className={flyoutLink}>
                {tDash("nav.student.saved")}
              </Link>
              <Link href="/dashboard/courses?tab=tools" className={flyoutLink}>
                {tDash("nav.student.learningTools")}
              </Link>
            </HoverMenu>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:ml-2">
            <div className="hidden sm:block">
            <HoverMenu
              trigger={
                <Link
                  href="/dashboard/courses?tab=wishlist"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-[5px] text-[#011B33] transition duration-200 hover:bg-white/70 hover:text-brand-accent dark:text-[#eef4ff] dark:hover:bg-white/10"
                  aria-label={tDash("nav.student.wishlist")}
                >
                  <Heart className="h-[18px] w-[18px]" strokeWidth={2} />
                  {wishCount > 0 ? (
                    <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-semibold text-white">
                      {wishCount}
                    </span>
                  ) : null}
                </Link>
              }
            >
              {wishItems.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#011B33]/70">Nothing saved yet. Heart a course to keep it here.</p>
              ) : (
                wishItems.slice(0, 5).map((item) => (
                  <Link key={item.slug} href={`/courses/${item.slug}`} className={flyoutLink}>
                    {item.title}
                  </Link>
                ))
              )}
              <Link href="/dashboard/courses?tab=wishlist" className={`${flyoutLink} border-t border-brand-ink/10 text-brand-accent`}>
                Open wishlist
              </Link>
            </HoverMenu>
            </div>
            <div className="hidden sm:block">
              <SiteHeaderCart />
            </div>
            <div className="hidden sm:block">
              <AppearanceMenu />
            </div>
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
              <DeskProfileSection title="Learning">
                <Link href="/dashboard/courses" className={flyoutLink}>
                  {tDash("nav.student.myCourses")}
                </Link>
                <Link href="/dashboard/progress" className={flyoutLink}>
                  {tDash("nav.student.progress")}
                </Link>
                <Link href="/dashboard/courses?tab=wishlist" className={flyoutLink}>
                  {tDash("nav.student.wishlist")}
                </Link>
                <Link href="/dashboard/courses?tab=lists" className={flyoutLink}>
                  {tDash("nav.student.myLists")}
                </Link>
                <Link href="/dashboard/courses?tab=saved" className={flyoutLink}>
                  {tDash("nav.student.saved")}
                </Link>
                <Link href="/dashboard/courses?tab=tools" className={flyoutLink}>
                  {tDash("nav.student.learningTools")}
                </Link>
                <Link href="/dashboard/certificates" className={flyoutLink}>
                  {tDash("nav.student.certificates")}
                </Link>
                <Link href="/dashboard/book-1on1" className={flyoutLink}>
                  {tDash("nav.student.bookOneOnOne")}
                </Link>
              </DeskProfileSection>
              <DeskProfileSection title="Discover">
                <Link href="/courses" className={flyoutLink}>
                  {tNav("explore")}
                </Link>
                <Link href="/dashboard/subscribe" className={flyoutLink}>
                  {tDash("nav.student.subscribe")}
                </Link>
                <Link href="/mentors" className={flyoutLink}>
                  {tNav("mentors")}
                </Link>
              </DeskProfileSection>
              <DeskProfileSection title="Account">
                <Link href="/dashboard/messages" className={flyoutLink}>
                  {tDash("nav.student.messages")}
                </Link>
                <Link href="/dashboard/settings" className={flyoutLink}>
                  {tDash("nav.student.settings")}
                </Link>
                <Link href="/dashboard/purchase-history" className={flyoutLink}>
                  {tDash("nav.student.purchaseHistory")}
                </Link>
                <Link href="/dashboard/payments" className={flyoutLink}>
                  {tDash("nav.student.payments")}
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
          <div className="border-t border-brand-ink/10 px-4 py-3 lg:hidden">
            <DeskMobileSection title="Learning">
              <Link href="/dashboard/courses" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.myCourses")}
              </Link>
              <Link href="/dashboard/progress" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.progress")}
              </Link>
              <Link href="/dashboard/book-1on1" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.bookOneOnOne")}
              </Link>
              <Link href="/dashboard/certificates" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.certificates")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Discover">
              <Link href="/courses" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tNav("explore")}
              </Link>
              <Link href="/dashboard/subscribe" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.subscribe")}
              </Link>
              <Link href="/mentors" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tNav("mentors")}
              </Link>
            </DeskMobileSection>
            <DeskMobileSection title="Account">
              <Link href="/dashboard/purchase-history" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.purchaseHistory")}
              </Link>
              <Link href="/dashboard/profile" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.publicProfile")}
              </Link>
              <Link href="/dashboard/settings" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.settings")}
              </Link>
              <div className="flex items-center justify-between py-2 sm:hidden">
                <span className="text-sm font-semibold">Appearance</span>
                <AppearanceMenu />
              </div>
            </DeskMobileSection>
            <DeskMobileSection title="Support">
              <Link href="/dashboard/support" className="block py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
                {tDash("nav.student.helpSupport")}
              </Link>
            </DeskMobileSection>
          </div>
        ) : null}
      </header>
      <main className="w-full flex-1">{children}</main>
      <StudentSiteFooter />
    </div>
  );
}
