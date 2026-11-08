import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { privateRobotsMetadata } from "@/lib/seo";

export const metadata: Metadata = privateRobotsMetadata("Instructor");

export default function InstructorLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
