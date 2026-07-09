"use client";

import { AdminDashboardHome } from "@/components/dashboard/AdminDashboardHome";
import { InstructorDashboardHome } from "@/components/dashboard/InstructorDashboardHome";
import { MentorDashboardHome } from "@/components/dashboard/MentorDashboardHome";
import { StudentDashboardHome } from "@/components/dashboard/StudentDashboardHome";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <AdminDashboardHome />;
  }
  if (user?.role === "instructor") {
    return <InstructorDashboardHome />;
  }
  if (user?.role === "mentor") {
    return <MentorDashboardHome />;
  }

  return <StudentDashboardHome />;
}
