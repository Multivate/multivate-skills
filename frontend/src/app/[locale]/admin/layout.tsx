import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/dashboard/AdminShell";
import { privateRobotsMetadata } from "@/lib/seo";

export const metadata: Metadata = privateRobotsMetadata("Admin");

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
