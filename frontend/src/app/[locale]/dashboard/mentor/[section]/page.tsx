import { notFound } from "next/navigation";
import { MentorSectionContent } from "@/components/dashboard/MentorSectionContent";
import { StudentSurface } from "@/components/dashboard/StudentPageHero";

const SECTIONS = new Set(["profile", "messages"]);

type Props = { params: Promise<{ section: string }> };

export default async function MentorSectionPage({ params }: Props) {
  const { section } = await params;
  if (!SECTIONS.has(section)) notFound();
  return (
    <StudentSurface>
      <MentorSectionContent section={section} />
    </StudentSurface>
  );
}
