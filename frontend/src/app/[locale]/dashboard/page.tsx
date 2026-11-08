"use client";

import { MentorDashboardHome } from "@/components/dashboard/MentorDashboardHome";
import { StudentDashboardHome } from "@/components/dashboard/StudentDashboardHome";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user || user.role === "admin" || user.role === "instructor") return null;

  if (user.role === "mentor") {
    return <MentorDashboardHome key={user.id} />;
  }

  return <StudentDashboardHome key={user.id} />;
}
