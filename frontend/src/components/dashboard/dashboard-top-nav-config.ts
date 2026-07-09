import { adminNavGroups } from "@/components/dashboard/admin-top-nav";

export type DashboardNavItem = { href: string; id: string };

export type DashboardNavGroup = {
  id: string;
  labelKey: string;
  items: DashboardNavItem[];
};

export type DashboardWorkspace = "admin" | "instructor" | "mentor" | "student";

export function navHrefActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function navGroupActive(pathname: string, group: DashboardNavGroup): boolean {
  return group.items.some((item) => navHrefActive(pathname, item.href));
}

export const instructorNavGroups: DashboardNavGroup[] = [
  {
    id: "teach",
    labelKey: "teach",
    items: [
      { href: "/dashboard/courses", id: "myCourses" },
      { href: "/dashboard/instructor/studio", id: "courseStudio" },
      { href: "/dashboard/instructor/studio/new", id: "createCourse" },
    ],
  },
  {
    id: "audience",
    labelKey: "audience",
    items: [
      { href: "/dashboard/instructor/students", id: "students" },
      { href: "/dashboard/instructor/reviews", id: "reviews" },
      { href: "/dashboard/messages", id: "messages" },
    ],
  },
  {
    id: "insights",
    labelKey: "insights",
    items: [
      { href: "/dashboard/instructor/analytics", id: "analytics" },
      { href: "/dashboard/instructor/earnings", id: "earnings" },
      { href: "/dashboard/payments", id: "billing" },
    ],
  },
];

export const mentorNavGroups: DashboardNavGroup[] = [
  {
    id: "workspace",
    labelKey: "workspace",
    items: [
      { href: "/dashboard/mentor/profile", id: "profile" },
      { href: "/dashboard/mentor/messages", id: "messages" },
    ],
  },
];

export const studentNavGroups: DashboardNavGroup[] = [
  {
    id: "learning",
    labelKey: "learning",
    items: [
      { href: "/dashboard/courses", id: "myCourses" },
      { href: "/dashboard/progress", id: "progress" },
      { href: "/dashboard/certificates", id: "certificates" },
    ],
  },
  {
    id: "account",
    labelKey: "account",
    items: [
      { href: "/dashboard/payments", id: "payments" },
      { href: "/dashboard/messages", id: "messages" },
    ],
  },
];

export const dashboardNavGroupsByWorkspace: Record<DashboardWorkspace, DashboardNavGroup[]> = {
  admin: adminNavGroups,
  instructor: instructorNavGroups,
  mentor: mentorNavGroups,
  student: studentNavGroups,
};

export const dashboardNavItemsNs: Record<DashboardWorkspace, string> = {
  admin: "nav.admin",
  instructor: "nav.instructor",
  mentor: "nav.mentor",
  student: "nav.student",
};

export const dashboardNavGroupsNs: Record<DashboardWorkspace, string> = {
  admin: "navGroups.admin",
  instructor: "navGroups.instructor",
  mentor: "navGroups.mentor",
  student: "navGroups.student",
};

export const dashboardAccent: Record<
  DashboardWorkspace,
  { active: string; focus: string; avatar: string; itemActive: string }
> = {
  admin: {
    active: "bg-admin-indigo/10 text-admin-indigo",
    itemActive: "bg-admin-indigo/8 text-admin-indigo",
    focus: "focus:border-admin-indigo focus:ring-2 focus:ring-admin-indigo/20",
    avatar: "bg-admin-indigo/15 text-admin-indigo",
  },
  instructor: {
    active: "bg-instructor-purple/10 text-instructor-purple",
    itemActive: "bg-instructor-purple/8 text-instructor-purple",
    focus: "focus:border-instructor-purple focus:ring-2 focus:ring-instructor-purple/20",
    avatar: "bg-instructor-purple/15 text-instructor-purple-deep",
  },
  mentor: {
    active: "bg-brand-accent/10 text-brand-accent",
    itemActive: "bg-brand-accent/10 text-brand-accent",
    focus: "focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20",
    avatar: "bg-brand-accent/15 text-brand-accent-dark",
  },
  student: {
    active: "bg-brand-primary/10 text-brand-primary",
    itemActive: "bg-brand-primary/8 text-brand-primary",
    focus: "focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
    avatar: "bg-brand-primary/15 text-brand-primary",
  },
};
