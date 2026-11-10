import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privateRobotsMetadata } from "@/lib/seo";

export const metadata: Metadata = privateRobotsMetadata("Classroom");

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <div className="desk-root min-h-dvh bg-white text-[#011B33] dark:bg-[#070e22] dark:text-[#eef4ff]">
      {children}
    </div>
  );
}
