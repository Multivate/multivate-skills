import { notFound } from "next/navigation";
import { InstructorSectionContent } from "@/components/dashboard/InstructorSectionContent";
import { StudentSurface } from "@/components/dashboard/StudentPageHero";

const SECTIONS = new Set(["create-course", "content-upload", "students", "analytics", "earnings", "reviews"]);

type Props = {
  params: Promise<{ section: string }>;
};

export default async function InstructorSectionPage({ params }: Props) {
  const { section } = await params;
  if (!SECTIONS.has(section)) {
    notFound();
  }
  return (
    <StudentSurface>
      <InstructorSectionContent section={section} />
    </StudentSurface>
  );
}
