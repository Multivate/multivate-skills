import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, MessageSquare, Settings, UserRound } from "lucide-react";

export const mentorNav: { href: string; id: string; icon: LucideIcon }[] = [
  { href: "/dashboard", id: "home", icon: LayoutDashboard },
  { href: "/dashboard/mentor/profile", id: "profile", icon: UserRound },
  { href: "/dashboard/mentor/messages", id: "messages", icon: MessageSquare },
  { href: "/dashboard/settings", id: "settings", icon: Settings },
];
