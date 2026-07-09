"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronDown, LogOut, Menu, Search, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/layout/LogoMark";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  dashboardAccent,
  dashboardNavGroupsByWorkspace,
  dashboardNavGroupsNs,
  dashboardNavItemsNs,
  navGroupActive,
  navHrefActive,
  type DashboardNavGroup,
  type DashboardWorkspace,
} from "@/components/dashboard/dashboard-top-nav-config";

type Props = {
  workspace: DashboardWorkspace;
  userName: string;
  userAvatar: string | null | undefined;
  roleLabel: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  notificationsLabel: string;
  onLogout: () => void;
};

function NavDropdown({
  group,
  pathname,
  accent,
  navItemsNs,
  navGroupsNs,
}: {
  group: DashboardNavGroup;
  pathname: string;
  accent: (typeof dashboardAccent)[DashboardWorkspace];
  navItemsNs: string;
  navGroupsNs: string;
}) {
  const tDash = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = navGroupActive(pathname, group);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          active ? accent.active : "text-slate-700 hover:bg-slate-100 hover:text-brand-ink"
        }`}
        aria-expanded={open}
      >
        {tDash(`${navGroupsNs}.${group.labelKey}`)}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
          {group.items.map((item) => {
            const itemActive = navHrefActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition ${
                  itemActive ? accent.itemActive : "text-slate-700 hover:bg-slate-50 hover:text-brand-ink"
                }`}
              >
                {tDash(`${navItemsNs}.${item.id}`)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardTopNav({
  workspace,
  userName,
  userAvatar,
  roleLabel,
  searchPlaceholder = "",
  showSearch = true,
  notificationsLabel,
  onLogout,
}: Props) {
  const pathname = usePathname();
  const tDash = useTranslations("dashboard");
  const navItemsNs = dashboardNavItemsNs[workspace] ?? "nav.student";
  const navGroupsNs = dashboardNavGroupsNs[workspace] ?? "navGroups.student";
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = dashboardNavGroupsByWorkspace[workspace] ?? dashboardNavGroupsByWorkspace.student;
  const accent = dashboardAccent[workspace] ?? dashboardAccent.student;
  const homeActive = navHrefActive(pathname, "/dashboard");
  const settingsActive = navHrefActive(pathname, "/dashboard/settings");

  const tNavItem = (id: string) => tDash(`${navItemsNs}.${id}`);
  const tNavGroup = (labelKey: string) => tDash(`${navGroupsNs}.${labelKey}`);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
            aria-label={tDash("shell.openMenu")}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="shrink-0" aria-label="Multivate">
            <LogoMark className="max-w-[8.5rem]" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label={tDash("shell.mainNav")}>
            <Link
              href="/dashboard"
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                homeActive ? accent.active : "text-slate-700 hover:bg-slate-100 hover:text-brand-ink"
              }`}
            >
              {tNavItem("home")}
            </Link>
            {groups.map((group) => (
              <NavDropdown
                key={group.id}
                group={group}
                pathname={pathname}
                accent={accent}
                navItemsNs={navItemsNs}
                navGroupsNs={navGroupsNs}
              />
            ))}
            <Link
              href="/dashboard/settings"
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                settingsActive ? accent.active : "text-slate-700 hover:bg-slate-100 hover:text-brand-ink"
              }`}
            >
              {tNavItem("settings")}
            </Link>
          </nav>

          {showSearch ? (
            <div className="mx-auto hidden min-w-0 max-w-md flex-1 md:block">
              <label className="relative block">
                <span className="sr-only">{tDash("shell.searchSr")}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-brand-ink placeholder:text-slate-400 outline-none transition ${accent.focus}`}
                />
              </label>
            </div>
          ) : (
            <div className="hidden flex-1 md:block" />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell label={notificationsLabel} />
            <Link
              href="/dashboard/settings"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-slate-300 sm:flex"
            >
              <UserAvatar name={userName} avatarUrl={userAvatar} className="h-9 w-9 text-sm" fallbackClassName={accent.avatar} />
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-bold text-brand-ink">{userName}</p>
                <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-brand-ink lg:inline-flex"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {tDash("shell.logOut")}
            </button>
          </div>
        </div>

        {showSearch ? (
          <div className="border-t border-slate-100 px-4 py-2 md:hidden">
            <label className="relative block">
              <span className="sr-only">{tDash("shell.searchSr")}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                placeholder={searchPlaceholder}
                className={`w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-brand-ink outline-none ${accent.focus}`}
              />
            </label>
          </div>
        ) : null}
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <LogoMark className="max-w-[8rem]" />
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto p-4">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className={`mb-4 block rounded-xl px-3 py-2.5 text-sm font-semibold ${homeActive ? accent.active : "text-slate-800"}`}
              >
                {tNavItem("home")}
              </Link>
              {groups.map((group) => (
                <div key={group.id} className="mb-5">
                  <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{tNavGroup(group.labelKey)}</p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`block rounded-xl px-3 py-2.5 text-sm font-medium ${
                            navHrefActive(pathname, item.href) ? accent.active : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {tDash(`${navItemsNs}.${item.id}`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-4">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${settingsActive ? accent.active : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <Settings className="h-4 w-4" />
                  {tNavItem("settings")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  {tDash("shell.logOut")}
                </button>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
