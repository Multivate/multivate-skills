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
  Users,
  Wallet,
} from "lucide-react";

export const instructorNav: { href: string; id: string; icon: LucideIcon }[] = [
  { href: "/instructor", id: "home", icon: LayoutDashboard },
  { href: "/dashboard/courses", id: "myCourses", icon: BookOpen },
  { href: "/instructor/studio", id: "courseStudio", icon: PlusCircle },
  { href: "/instructor/students", id: "students", icon: Users },
  { href: "/instructor/analytics", id: "analytics", icon: BarChart3 },
  { href: "/instructor/earnings", id: "earnings", icon: Wallet },
  { href: "/dashboard/payments", id: "billing", icon: CreditCard },
  { href: "/instructor/reviews", id: "reviews", icon: Star },
  { href: "/dashboard/messages", id: "messages", icon: MessageSquare },
  { href: "/dashboard/settings", id: "settings", icon: Settings },
];
