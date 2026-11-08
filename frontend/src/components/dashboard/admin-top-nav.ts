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
      { href: "/admin/users", id: "users" },
      { href: "/admin/student-profiles", id: "studentProfiles" },
      { href: "/admin/instructor-profiles", id: "instructorProfiles" },
      { href: "/admin/instructors", id: "instructors" },
      { href: "/admin/mentors", id: "mentors" },
    ],
  },
  {
    id: "content",
    labelKey: "content",
    items: [
      { href: "/admin/courses", id: "courses" },
      { href: "/admin/reviews", id: "reviews" },
      { href: "/admin/certificates", id: "certificates" },
    ],
  },
  {
    id: "commerce",
    labelKey: "commerce",
    items: [
      { href: "/admin/payments", id: "payments" },
      { href: "/admin/discount-codes", id: "discountCodes" },
      { href: "/admin/enrollments", id: "enrollments" },
    ],
  },
  {
    id: "insights",
    labelKey: "insights",
    items: [
      { href: "/admin/analytics", id: "analytics" },
      { href: "/admin/data-management", id: "dataManagement" },
    ],
  },
  {
    id: "administration",
    labelKey: "administration",
    items: [
      { href: "/admin/security", id: "security" },
      { href: "/admin/system-logs", id: "systemLogs" },
    ],
  },
];

export function adminGroupActive(pathname: string, group: AdminNavGroup): boolean {
  return group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function adminHrefActive(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Flat list for pages that still iterate all admin links. */
export const adminNavFlat = [
  { href: "/admin", id: "home" },
  ...adminNavGroups.flatMap((g) => g.items),
  { href: "/admin/settings", id: "settings" },
  { href: "/admin/system-logs", id: "systemLogs" },
];
