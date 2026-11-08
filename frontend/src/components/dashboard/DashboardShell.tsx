"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useEffect, type ReactNode } from "react";
import { DashboardTopNav } from "@/components/dashboard/DashboardTopNav";
import { InstructorShell } from "@/components/dashboard/InstructorShell";
import { MentorShell } from "@/components/dashboard/MentorShell";
import { StudentShell } from "@/components/dashboard/StudentShell";
import type { DashboardWorkspace } from "@/components/dashboard/dashboard-top-nav-config";
import { useAuth } from "@/contexts/auth-context";
import { hardNavigate, homeForRole } from "@/lib/auth-navigation";
import type { UserRole } from "@/types/user";

function workspaceFor(role: UserRole | string | undefined): DashboardWorkspace {
  if (role === "admin") return "admin";
  if (role === "instructor") return "instructor";
  if (role === "mentor") return "mentor";
  return "student";
}

function roleLabelKey(role: string): "instructor" | "admin" | "student" | "mentor" {
  if (role === "instructor") return "instructor";
  if (role === "admin") return "admin";
  if (role === "mentor") return "mentor";
  return "student";
}

function workspaceRoleLabel(workspace: DashboardWorkspace, role: string, tDash: (key: string) => string) {
  if (workspace === "admin") return tDash("shell.superAdmin");
  return tDash(`roles.${roleLabelKey(role)}`);
}

function workspaceSearchPlaceholder(workspace: DashboardWorkspace, tDash: (key: string) => string) {
  if (workspace === "admin") return tDash("shell.searchAdminPh");
  if (workspace === "mentor") return tDash("shell.searchMentorPh");
  if (workspace === "instructor") return tDash("shell.searchInstructorPh");
  return tDash("shell.searchStudentPh");
}

function notificationsLabel(workspace: DashboardWorkspace, tDash: (key: string) => string) {
  if (workspace === "admin") return tDash("shell.notificationsAdmin");
  return tDash("shell.notifications");
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();
  const tDash = useTranslations("dashboard");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const from = pathname.startsWith("/") ? pathname : "/dashboard";
      hardNavigate(`/login?from=${encodeURIComponent(from)}`, locale);
      return;
    }
    const home = homeForRole(user.role);
    if (pathname.startsWith("/admin") && user.role !== "admin") {
      hardNavigate(home, locale);
      return;
    }
    if (pathname.startsWith("/instructor") && user.role !== "instructor") {
      hardNavigate(home, locale);
      return;
    }
    if (pathname === "/dashboard" && (user.role === "admin" || user.role === "instructor")) {
      hardNavigate(home, locale);
    }
    if (user.role === "admin" && pathname.startsWith("/dashboard/settings")) {
      hardNavigate("/admin/settings", locale);
    }
  }, [loading, user, locale, pathname]);

  async function onLogout() {
    await logout();
    hardNavigate("/", locale);
  }

  if (loading || !user || (user.role === "admin" && pathname.startsWith("/dashboard/settings"))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-paper">
        <p className="text-sm font-medium text-neutral-500">{tDash("loadingWorkspace")}</p>
      </div>
    );
  }

  const workspace = workspaceFor(user.role);
  if (workspace === "student") {
    return <StudentShell key={user.id}>{children}</StudentShell>;
  }
  if (workspace === "mentor") {
    return <MentorShell key={user.id}>{children}</MentorShell>;
  }
  if (workspace === "instructor") {
    return <InstructorShell key={user.id}>{children}</InstructorShell>;
  }
  const showSearch = workspace === "admin";
  const searchPlaceholder = showSearch ? workspaceSearchPlaceholder(workspace, tDash) : "";

  return (
    <div className="min-h-screen bg-brand-paper" key={user.id}>
      <DashboardTopNav
        workspace={workspace}
        userName={user.name}
        userAvatar={user.avatar_url}
        roleLabel={workspaceRoleLabel(workspace, user.role, tDash)}
        searchPlaceholder={searchPlaceholder}
        showSearch={showSearch}
        notificationsLabel={notificationsLabel(workspace, tDash)}
        onLogout={() => void onLogout()}
      />
      <main className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">{children}</main>
    </div>
  );
}
