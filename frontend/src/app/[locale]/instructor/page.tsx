"use client";

import { InstructorDashboardHome } from "@/components/dashboard/InstructorDashboardHome";
import { useAuth } from "@/contexts/auth-context";

export default function InstructorHomePage() {
  const { user } = useAuth();
  if (!user || user.role !== "instructor") return null;
  return <InstructorDashboardHome key={user.id} />;
}
