"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Wallet,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/layout/LogoMark";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/auth-context";
import { adminNav } from "@/components/dashboard/admin-nav";
import { instructorNav } from "@/components/dashboard/instructor-nav";
import type { UserRole } from "@/types/user";

const studentNav: { href: string; id: string; icon: LucideIcon }[] = [
  { href: "/dashboard", id: "home", icon: LayoutDashboard },
  { href: "/dashboard/courses", id: "myCourses", icon: BookOpen },
  { href: "/dashboard/payments", id: "payments", icon: Wallet },
  { href: "/dashboard/progress", id: "progress", icon: LineChart },
  { href: "/dashboard/certificates", id: "certificates", icon: Award },
  { href: "/dashboard/messages", id: "messages", icon: MessageSquare },
  { href: "/dashboard/settings", id: "settings", icon: Settings },
];

type Workspace = "student" | "instructor" | "admin";

function workspaceFor(role: UserRole): Workspace {
  if (role === "admin") return "admin";
  if (role === "instructor") return "instructor";
  return "student";
}

function roleLabelKey(role: string): "instructor" | "admin" | "student" {
  if (role === "instructor") return "instructor";
  if (role === "admin") return "admin";
  return "student";
}

function navActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function proNavLinkClass(workspace: Workspace, active: boolean): string {
  if (workspace === "admin") {
    return active
      ? "border-l-[3px] border-admin-indigo bg-admin-indigo/25 text-white"
      : "border-l-[3px] border-transparent text-white/75 hover:bg-white/[0.07] hover:text-white";
  }
  if (workspace === "instructor") {
    return active
      ? "border-l-[3px] border-instructor-purple bg-instructor-purple/20 text-white"
      : "border-l-[3px] border-transparent text-white/75 hover:bg-white/[0.07] hover:text-white";
  }
  return active ? "bg-white/12 text-white" : "text-white/80 hover:bg-white/8 hover:text-white";
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const tDash = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tNavStudent = useTranslations("dashboard.nav.student");
  const tNavAdmin = useTranslations("dashboard.nav.admin");
  const tNavInstructor = useTranslations("dashboard.nav.instructor");
  const [mobileOpen, setMobileOpen] = useState(false);

  const workspace = user ? workspaceFor(user.role) : "student";
  const isProWorkspace = workspace === "instructor" || workspace === "admin";

  const nav =
    workspace === "admin" ? adminNav : workspace === "instructor" ? instructorNav : studentNav;

  useEffect(() => {
    if (!loading && !user) {
      const from = pathname.startsWith("/") ? pathname : "/dashboard";
      router.replace(`/login?from=${encodeURIComponent(from)}`);
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function onLogout() {
    await logout();
    router.replace("/");
    router.refresh();
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-600">{tDash("loadingWorkspace")}</p>
      </div>
    );
  }

  const firstName = user.name.split(" ")[0] ?? user.name;
  const initial = firstName.slice(0, 1).toUpperCase();

  function navItemLabel(id: string): string {
    if (workspace === "admin") return tNavAdmin(id);
    if (workspace === "instructor") return tNavInstructor(id);
    return tNavStudent(id);
  }

  function SidebarNavLinks({ onNavigate, isDrawer }: { onNavigate?: () => void; isDrawer?: boolean }) {
    return (
      <nav
        className={`flex flex-col gap-0.5 px-3 py-4 ${isDrawer ? "" : "min-h-0 flex-1 overflow-y-auto"}`}
        aria-label={tDash("shell.mainNav")}
      >
        {nav.map(({ href, id, icon: Icon }) => {
          const active = navActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${proNavLinkClass(workspace, active)}`}
            >
              <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
              {navItemLabel(id)}
            </Link>
          );
        })}
      </nav>
    );
  }

  const shellBg =
    workspace === "admin"
      ? "bg-admin-canvas dark:bg-slate-950"
      : workspace === "instructor"
        ? "bg-instructor-canvas dark:bg-slate-950"
        : "bg-slate-50 dark:bg-slate-950";

  const asideShell =
    workspace === "admin"
      ? "border-white/5 bg-admin-sidebar text-white"
      : workspace === "instructor"
        ? "border-white/5 bg-instructor-sidebar text-white"
        : "border-white/10 bg-brand-panel text-white";

  const drawerBg =
    workspace === "admin" ? "bg-admin-sidebar text-white" : "bg-instructor-sidebar text-white";

  const mobileNavActive =
    workspace === "admin"
      ? "text-admin-indigo"
      : workspace === "instructor"
        ? "text-instructor-purple"
        : "text-brand-panel";

  const searchFocus =
    workspace === "admin"
      ? "focus:border-admin-indigo focus:ring-2 focus:ring-admin-indigo/25"
      : "focus:border-instructor-purple focus:ring-2 focus:ring-instructor-purple/25";

  return (
    <div className={`min-h-screen ${shellBg}`}>
      <aside
        className={`hidden min-h-0 lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r ${asideShell}`}
      >
        <div className="flex h-[4.25rem] shrink-0 items-center border-b border-white/10 px-5">
          <Link href="/" className="inline-flex flex-col gap-0.5" aria-label={tNav("homeAria")}>
            <LogoMark variant="inverse" className="max-w-[9.5rem]" />
            {workspace === "instructor" ? (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                <GraduationCap className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {tDash("shell.instructorBadge")}
              </span>
            ) : null}
            {workspace === "admin" ? (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                <Shield className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                {tDash("shell.adminBadge")}
              </span>
            ) : null}
          </Link>
        </div>

        <SidebarNavLinks />

        {workspace === "instructor" ? (
          <div className="mx-3 mt-2 shrink-0 rounded-2xl border border-white/10 bg-instructor-card-dark p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-lg" aria-hidden>
                ⭐
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{tDash("shell.instructorEncouragement")}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">{tDash("shell.instructorEncouragementBody")}</p>
                <Link
                  href="/dashboard/courses"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-instructor-orange px-3 py-2.5 text-center text-xs font-bold text-white transition hover:bg-instructor-orange-hover"
                >
                  {tDash("shell.viewMyCourses")}
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {workspace === "admin" ? (
          <div className="mx-3 mt-2 shrink-0 rounded-2xl border border-white/10 bg-admin-card-dark p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-lg" aria-hidden>
                👑
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{tDash("shell.adminProTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">{tDash("shell.adminProBody")}</p>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-admin-orange px-3 py-2.5 text-center text-xs font-bold text-white transition hover:bg-admin-orange-hover"
                >
                  {tDash("shell.upgradeNow")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-auto border-t border-white/10 p-3">
          {isProWorkspace ? (
            <div className="space-y-2">
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.07]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-1 ring-white/15 ${
                    workspace === "admin" ? "bg-admin-indigo/40" : "bg-instructor-purple/35"
                  }`}
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{user.name}</p>
                  <p className="text-xs font-medium text-white/55">
                    {workspace === "admin" ? tDash("shell.superAdmin") : tDash("roles.instructor")}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
                {tDash("shell.logOut")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
              {tDash("shell.logOut")}
            </button>
          )}
        </div>
      </aside>

      {mobileOpen && isProWorkspace ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={tDash("shell.menuDialog")}>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60"
            aria-label={tDash("shell.closeMenu")}
            onClick={() => setMobileOpen(false)}
          />
          <div className={`absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-white/10 shadow-xl ${drawerBg}`}>
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-4">
              <LogoMark variant="inverse" className="max-w-[8.5rem]" />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10"
                aria-label={tDash("shell.closeMenu")}
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNavLinks isDrawer onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800/90 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/85">
          <div className="flex h-14 flex-wrap items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
            {isProWorkspace ? (
              <>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label={tDash("shell.openMenu")}
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" strokeWidth={2} />
                </button>
                <h1 className="min-w-0 shrink-0 text-base font-extrabold tracking-tight text-brand-ink dark:text-slate-100 sm:text-lg">
                  {workspace === "admin"
                    ? tDash("shell.adminDashboardTitle")
                    : tDash("shell.instructorDashboardTitle")}
                </h1>
                <div className="mx-2 hidden min-w-0 flex-1 md:block md:max-w-xl lg:mx-4 lg:max-w-2xl">
                  <label className="relative block">
                    <span className="sr-only">{tDash("shell.searchSr")}</span>
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <input
                      type="search"
                      placeholder={
                        workspace === "admin" ? tDash("shell.searchAdminPh") : tDash("shell.searchInstructorPh")
                      }
                      className={`w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-sm font-medium text-brand-ink placeholder:text-slate-400 outline-none ring-inset transition dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500 ${searchFocus}`}
                    />
                  </label>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                  <NotificationBell label={tDash("shell.notificationsAdmin")} />
                  <Link
                    href="/dashboard/settings"
                    className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 dark:border-slate-700 dark:bg-slate-800 sm:flex"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                        workspace === "admin"
                          ? "bg-admin-indigo/15 text-admin-indigo"
                          : "bg-instructor-purple/15 text-instructor-purple-deep"
                      }`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-bold text-brand-ink dark:text-slate-100">{user.name}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {workspace === "admin" ? tDash("shell.superAdmin") : tDash("roles.instructor")}
                      </p>
                    </div>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand-ink dark:text-slate-100 sm:text-base">
                    {tDash("shell.welcomeBack", { name: firstName })}{" "}
                    <span className="font-normal text-slate-500 dark:text-slate-400" aria-hidden>
                      👋
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
                    <span className="text-slate-300 dark:text-slate-600"> · </span>
                    {tDash(`roles.${roleLabelKey(user.role)}`)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  <NotificationBell label={tDash("shell.notifications")} />
                  <div className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-brand-panel dark:border-slate-700 dark:bg-slate-800 dark:text-violet-200 sm:flex">
                    {initial}
                  </div>
                </div>
              </>
            )}
          </div>
          {isProWorkspace ? (
            <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800 md:hidden">
              <label className="relative block">
                <span className="sr-only">{tDash("shell.searchSr")}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  placeholder={
                    workspace === "admin" ? tDash("shell.searchAdminPh") : tDash("shell.searchInstructorPh")
                  }
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-brand-ink outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${searchFocus}`}
                />
              </label>
            </div>
          ) : null}
        </header>

        <main className="px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:py-10 lg:pb-10">{children}</main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden"
        aria-label={tDash("shell.mobileNav")}
      >
        {isProWorkspace ? (
          <div className="flex gap-1 overflow-x-auto px-2 py-2">
            {nav.map(({ href, id, icon: Icon }) => {
              const active = navActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[9px] font-semibold leading-tight sm:min-w-[4.75rem] sm:text-[10px] ${
                    active ? mobileNavActive : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} aria-hidden />
                  <span className="max-w-[4.5rem] truncate text-center">{navItemLabel(id)}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex px-0.5 py-1.5 sm:px-1">
            {nav.map(({ href, id, icon: Icon }) => {
              const active = navActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 text-[9px] font-semibold leading-tight sm:text-[10px] ${
                    active ? "text-brand-panel dark:text-violet-300" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={2} aria-hidden />
                  <span className="max-w-full truncate text-center">{navItemLabel(id)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
