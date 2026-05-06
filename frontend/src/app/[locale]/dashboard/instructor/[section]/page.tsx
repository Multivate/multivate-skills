import { notFound } from "next/navigation";
import { InstructorSectionContent } from "@/components/dashboard/InstructorSectionContent";

const SECTIONS = new Set([
  "create-course",
  "content-upload",
  "students",
  "analytics",
  "earnings",
  "reviews",
]);

const TITLES: Record<string, string> = {
  "create-course": "Create course",
  "content-upload": "Content upload",
  students: "Students",
  analytics: "Analytics",
  earnings: "Earnings",
  reviews: "Reviews",
};

type Props = {
  params: Promise<{ section: string }>;
};

export default async function InstructorSectionPage({ params }: Props) {
  const { section } = await params;
  if (!SECTIONS.has(section)) {
    notFound();
  }
  const title = TITLES[section] ?? "Instructor";
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">{title}</h1>
      <InstructorSectionContent section={section} />
    </div>
  );
}
