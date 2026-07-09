export type AdminNavItem = { href: string; id: string };

export type AdminNavGroup = {
  id: string;
  labelKey: string;
  items: AdminNavItem[];
};

/** Grouped admin navigation for top bar dropdowns. */
export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "people",
    labelKey: "people",
    items: [
      { href: "/dashboard/admin/users", id: "users" },
      { href: "/dashboard/admin/student-profiles", id: "studentProfiles" },
      { href: "/dashboard/admin/instructor-profiles", id: "instructorProfiles" },
      { href: "/dashboard/admin/instructors", id: "instructors" },
      { href: "/dashboard/admin/mentors", id: "mentors" },
    ],
  },
  {
    id: "content",
    labelKey: "content",
    items: [
      { href: "/dashboard/admin/courses", id: "courses" },
      { href: "/dashboard/admin/reviews", id: "reviews" },
      { href: "/dashboard/admin/certificates", id: "certificates" },
    ],
  },
  {
    id: "commerce",
    labelKey: "commerce",
    items: [
      { href: "/dashboard/admin/payments", id: "payments" },
      { href: "/dashboard/admin/discount-codes", id: "discountCodes" },
      { href: "/dashboard/admin/enrollments", id: "enrollments" },
    ],
  },
  {
    id: "insights",
    labelKey: "insights",
    items: [
      { href: "/dashboard/admin/analytics", id: "analytics" },
      { href: "/dashboard/admin/data-management", id: "dataManagement" },
    ],
  },
];

export function adminGroupActive(pathname: string, group: AdminNavGroup): boolean {
  return group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function adminHrefActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Flat list for pages that still iterate all admin links. */
export const adminNavFlat = [
  { href: "/dashboard", id: "home" },
  ...adminNavGroups.flatMap((g) => g.items),
  { href: "/dashboard/settings", id: "settings" },
  { href: "/dashboard/admin/system-logs", id: "systemLogs" },
];
