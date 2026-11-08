import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privateRobotsMetadata } from "@/lib/seo";

export const metadata: Metadata = privateRobotsMetadata("Classroom");

export default function LearnLayout({ children }: { children: ReactNode }) {
  return children;
}
