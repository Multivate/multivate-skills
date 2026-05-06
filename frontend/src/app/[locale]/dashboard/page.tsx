"use client";

import { AdminDashboardHome } from "@/components/dashboard/AdminDashboardHome";
import { InstructorDashboardHome } from "@/components/dashboard/InstructorDashboardHome";
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

  return <StudentDashboardHome />;
}
