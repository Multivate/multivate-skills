"use client";

import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CreditCard,
  Database,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Search,
  Settings,
  Shield,
  Star,
  Ticket,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { adminNavGroups } from "@/components/dashboard/admin-top-nav";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { LogoMark } from "@/components/layout/LogoMark";
import { AppearanceMenu, useAppearance } from "@/components/theme/AppearanceMenu";
import { useAuth } from "@/contexts/auth-context";
import { Link, usePathname } from "@/i18n/navigation";
import { hardNavigate, homeForRole } from "@/lib/auth-navigation";

export type AdminDash = {
  totals: {
    total_users: number;
    total_courses: number;
    total_enrollments: number;
    revenue_completed_cents: number;
    payments_pending_count: number;
    avg_progress_pct?: number;
  };
  users_by_role: { role: string; count: number }[];
  mentor_stats: { approved_profiles: number; pending_profiles: number };
  payment_statuses?: { status: string; label: string; count: number }[];
  recent_users?: { id: string; name: string; email: string; role: string; is_active: boolean; created_at: string }[];
  recent_enrollments?: { user_name: string; user_email: string; course_title: string; created_at: string }[];
  recent_payments?: { id: string; amount_cents: number; currency: string; status: string; created_at: string; user_email: string; course_title: string | null }[];
  top_courses: { slug: string; title: string; enrollment_count: number }[];
  growth?: {
    users: { date: string; count: number }[];
    enrollments: { date: string; count: number }[];
    revenue: { date: string; amount_cents: number }[];
  };
};

type ConsoleValue = {
  data: AdminDash | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

const ConsoleContext = createContext<ConsoleValue>({
  data: null,
  error: null,
  loading: true,
  reload: () => {},
});

export function useAdminConsole() {
  return useContext(ConsoleContext);
}

const ICONS: Record<string, LucideIcon> = {
  home: LayoutDashboard,
  users: Users,
  studentProfiles: GraduationCap,
  instructorProfiles: BookOpen,
  instructors: UserRound,
  mentors: BadgeCheck,
  courses: BookOpen,
  reviews: Star,
  certificates: Award,
  payments: CreditCard,
  discountCodes: Ticket,
  enrollments: Users,
  analytics: BarChart3,
  dataManagement: Database,
  systemLogs: ScrollText,
  security: Shield,
  settings: Settings,
};

function itemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();
  const tDash = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuScrollRef = useRef<HTMLElement>(null);
  useBodyScrollLock(open, menuScrollRef);
  useBodyScrollLock(accountOpen, undefined, "events");
  const [query, setQuery] = useState("");
  const { dark } = useAppearance();
  const [data, setData] = useState<AdminDash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  const reload = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(res.status === 401 ? "Your session expired. Sign in again." : "The admin overview could not be loaded.");
        setData(null);
        return;
      }
      setError(null);
      setData(body as AdminDash);
    } catch {
      setError("Connection problem. Please try again.");
    } finally {
      setDashLoading(false);
    }
  }, []);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      hardNavigate(`/login?from=${encodeURIComponent(pathname || "/admin")}`, locale);
      return;
    }
    if (user.role !== "admin") {
      hardNavigate(homeForRole(user.role), locale);
    }
  }, [loading, user, locale, pathname]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void reload();
  }, [user, reload]);

  const consoleValue = useMemo<ConsoleValue>(
    () => ({ data, error, loading: dashLoading, reload: () => void reload() }),
    [data, error, dashLoading, reload],
  );

  const pendingPayments = data?.totals.payments_pending_count ?? 0;
  const pendingMentors = data?.mentor_stats?.pending_profiles ?? 0;
  const needle = query.trim().toLowerCase();

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="admin-console flex min-h-screen items-center justify-center">
        <p className="admin-muted text-sm font-medium">{tDash("loadingWorkspace")}</p>
      </div>
    );
  }

  const sidebar = (
    <div className="relative h-full">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-[#e7f4ff] via-[#f4f9ff]/70 to-transparent dark:from-[#2B8AE0]/20 dark:via-[#1457D0]/10 dark:to-transparent"
      />
      <div className="relative z-10 flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-4 py-5" aria-label="Multivate admin">
        <LogoMark variant={dark ? "inverse" : "default"} className="max-w-[8.5rem]" />
      </Link>
      <p className={`-mt-3 px-4 pb-4 text-xs ${dark ? "text-white/45" : "text-[#8b97ab]"}`}>Admin console</p>
      <label className="relative mx-3 mb-4 block lg:hidden">
        <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-white/45" : "text-[#8b97ab]"}`} aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the console"
          className={`h-10 w-full rounded-xl border pl-9 pr-3 text-sm outline-none ${
            dark ? "border-white/10 bg-white/10 text-white placeholder:text-white/40" : "border-[#e3ebf5] bg-[#f4f7fb] text-[#10244F] placeholder:text-[#8b97ab]"
          }`}
        />
      </label>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label={tDash("shell.mainNav")}>
        <SidebarLink
          href="/admin"
          label={tDash("nav.admin.home")}
          icon={ICONS.home}
          dark={dark}
          active={pathname === "/admin"}
          hidden={needle.length > 0 && !tDash("nav.admin.home").toLowerCase().includes(needle)}
        />
        {adminNavGroups.map((group) => {
          const items = group.items.filter((item) => {
            if (!needle) return true;
            return tDash(`nav.admin.${item.id}`).toLowerCase().includes(needle);
          });
          if (items.length === 0) return null;
          return (
            <div key={group.id}>
              <p className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${dark ? "text-white/40" : "text-[#8b97ab]"}`}>
                {tDash(`navGroups.admin.${group.labelKey}`)}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={tDash(`nav.admin.${item.id}`)}
                    icon={ICONS[item.id] ?? LayoutDashboard}
                    dark={dark}
                    active={itemActive(pathname, item.href)}
                    badge={
                      item.id === "payments" && pendingPayments > 0
                        ? pendingPayments
                        : item.id === "mentors" && pendingMentors > 0
                          ? pendingMentors
                          : undefined
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className={`border-t p-3 ${dark ? "border-white/10" : "border-[#e6ebf2]"}`}>
        <div className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 ${dark ? "bg-white/[0.06]" : "bg-[#f1f2f6]"}`}>
          <PersonMark name={user.name} className="h-9 w-9" />
          <span className="min-w-0">
            <span className={`block truncate text-sm font-semibold ${dark ? "text-white" : "text-[#10244F]"}`}>{user.name}</span>
            <span className={`block text-xs ${dark ? "text-white/50" : "text-[#8b97ab]"}`}>Admin</span>
          </span>
          <button
            type="button"
            className={`ml-auto rounded-lg p-2 transition ${dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-[#5c6b84] hover:bg-white hover:text-[#10244F]"}`}
            aria-label={tDash("shell.logOut")}
            onClick={() => {
              void logout().then(() => hardNavigate("/", locale));
            }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );

  return (
    <ConsoleContext.Provider value={consoleValue}>
      <div className={`admin-console min-h-screen ${dark ? "dark" : ""}`}>
        <aside className={`fixed inset-y-0 left-0 z-40 hidden w-64 lg:block ${dark ? "bg-[#070E22] text-white" : "border-r border-[#e6ebf2] bg-white text-[#10244F]"}`}>{sidebar}</aside>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-[#070E22]/60" aria-label={tDash("shell.closeMenu")} onClick={() => setOpen(false)} />
            <aside ref={menuScrollRef} className={`relative z-10 h-full w-72 max-w-[85vw] overflow-y-auto overscroll-contain ${dark ? "bg-[#070E22] text-white" : "bg-white text-[#10244F]"}`}>{sidebar}</aside>
          </div>
        ) : null}
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 isolate flex h-16 items-center gap-3 border-b border-[var(--admin-line)] bg-[var(--admin-bg)] px-4 sm:px-6">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg lg:hidden"
              aria-label={open ? tDash("shell.closeMenu") : tDash("shell.openMenu")}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <label className="relative hidden min-w-0 flex-1 lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b97ab]" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the console"
                className="h-10 w-full max-w-xl rounded-xl border border-[var(--admin-line)] bg-[var(--admin-card)] pl-10 pr-3 text-sm outline-none placeholder:text-[#8b97ab]"
              />
            </label>
            <div className="ml-auto flex items-center gap-2">
              <AppearanceMenu variant="admin" />
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-line)] bg-[var(--admin-card)] py-1 pl-1 pr-3 text-sm font-medium"
                  onClick={() => {
                    setAccountOpen((value) => !value);
                  }}
                >
                  <PersonMark name={user.name} className="h-8 w-8 text-[11px]" />
                  <span className="hidden max-w-[9rem] truncate sm:inline">{user.name}</span>
                </button>
                {accountOpen ? (
                  <div className="admin-card absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl py-1 shadow-[0_12px_32px_rgba(7,14,34,0.18)]">
                    <p className="admin-muted truncate px-3 py-2 text-xs">{user.email}</p>
                    <Link href="/admin/settings" className="block px-3 py-2 text-sm font-medium hover:bg-[var(--admin-soft)]">
                      {tDash("nav.admin.settings")}
                    </Link>
                    <Link href="/admin/system-logs" className="block px-3 py-2 text-sm font-medium hover:bg-[var(--admin-soft)]">
                      {tDash("nav.admin.systemLogs")}
                    </Link>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm font-medium hover:bg-[var(--admin-soft)]"
                      onClick={() => {
                        void logout().then(() => hardNavigate("/", locale));
                      }}
                    >
                      {tDash("shell.logOut")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </ConsoleContext.Provider>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  hidden,
  dark,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  hidden?: boolean;
  dark: boolean;
}) {
  if (hidden) return null;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-200 ${
        dark
          ? active
            ? "bg-white/20 text-white"
            : "text-white/75 hover:bg-white/10 hover:text-white"
          : active
            ? "bg-[#E7F1FC] text-[#1457D0]"
            : "text-[#31415f] hover:bg-[#f4f7fb]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full bg-[#1457D0] px-1.5 py-0.5 text-[11px] font-semibold text-white">{badge}</span>
      ) : null}
    </Link>
  );
}
