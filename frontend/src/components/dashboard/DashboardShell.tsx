"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, type ReactNode } from "react";
import { DashboardTopNav } from "@/components/dashboard/DashboardTopNav";
import type { DashboardWorkspace } from "@/components/dashboard/dashboard-top-nav-config";
import { useAuth } from "@/contexts/auth-context";
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
  const router = useRouter();
  const pathname = usePathname();
  const tDash = useTranslations("dashboard");

  useEffect(() => {
    if (!loading && !user) {
      const from = pathname.startsWith("/") ? pathname : "/dashboard";
      router.replace(`/login?from=${encodeURIComponent(from)}`);
    }
  }, [loading, user, router, pathname]);

  async function onLogout() {
    await logout();
    router.replace("/");
    router.refresh();
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm font-medium text-slate-600">{tDash("loadingWorkspace")}</p>
      </div>
    );
  }

  const workspace = workspaceFor(user.role);
  const showSearch = workspace === "admin" || workspace === "instructor";
  const searchPlaceholder = showSearch ? workspaceSearchPlaceholder(workspace, tDash) : "";

  return (
    <div className="min-h-screen bg-white">
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
      <main className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
