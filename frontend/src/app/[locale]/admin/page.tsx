"use client";

import { AdminDashboardHome } from "@/components/dashboard/AdminDashboardHome";
import { useAuth } from "@/contexts/auth-context";

export default function AdminHomePage() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return null;
  return <AdminDashboardHome key={user.id} />;
}
