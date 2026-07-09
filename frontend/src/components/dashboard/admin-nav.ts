import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  ListChecks,
  Network,
  ScrollText,
  Settings,
  Star,
  Tag,
  Users,
  UserRound,
} from "lucide-react";
import { adminNavFlat } from "@/components/dashboard/admin-top-nav";

const iconById: Record<string, LucideIcon> = {
  home: LayoutDashboard,
  dataManagement: Network,
  users: Users,
  studentProfiles: ListChecks,
  instructorProfiles: IdCard,
  mentors: UserRound,
  courses: BookOpen,
  instructors: GraduationCap,
  enrollments: ClipboardList,
  payments: CreditCard,
  discountCodes: Tag,
  certificates: Award,
  analytics: BarChart3,
  reviews: Star,
  settings: Settings,
  systemLogs: ScrollText,
};

/** @deprecated Use admin-top-nav groups for admin shell. Kept for legacy references. */
export const adminNav = adminNavFlat.map((item) => ({
  ...item,
  icon: iconById[item.id] ?? LayoutDashboard,
}));

export { adminNavGroups, adminNavFlat } from "@/components/dashboard/admin-top-nav";
