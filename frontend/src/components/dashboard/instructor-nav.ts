import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Settings,
  Star,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

export const instructorNav: { href: string; id: string; icon: LucideIcon }[] = [
  { href: "/dashboard", id: "home", icon: LayoutDashboard },
  { href: "/dashboard/courses", id: "myCourses", icon: BookOpen },
  { href: "/dashboard/instructor/studio", id: "courseStudio", icon: PlusCircle },
  { href: "/dashboard/instructor/studio/new", id: "createCourse", icon: Upload },
  { href: "/dashboard/instructor/students", id: "students", icon: Users },
  { href: "/dashboard/instructor/analytics", id: "analytics", icon: BarChart3 },
  { href: "/dashboard/instructor/earnings", id: "earnings", icon: Wallet },
  { href: "/dashboard/payments", id: "billing", icon: CreditCard },
  { href: "/dashboard/instructor/reviews", id: "reviews", icon: Star },
  { href: "/dashboard/messages", id: "messages", icon: MessageSquare },
  { href: "/dashboard/settings", id: "settings", icon: Settings },
];
