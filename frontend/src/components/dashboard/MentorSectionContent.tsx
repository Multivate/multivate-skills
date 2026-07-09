"use client";

import { MentorProfileEditor } from "@/components/dashboard/MentorProfileEditor";
import { MentorSectionMessages } from "@/components/dashboard/MentorSectionMessages";

export function MentorSectionContent({ section }: { section: string }) {
  if (section === "profile") {
    return <MentorProfileEditor />;
  }
  if (section === "messages") {
    return <MentorSectionMessages />;
  }
  return null;
}
