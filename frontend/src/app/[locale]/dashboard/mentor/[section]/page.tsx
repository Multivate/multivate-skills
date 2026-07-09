import { notFound } from "next/navigation";
import { MentorSectionContent } from "@/components/dashboard/MentorSectionContent";

const SECTIONS = new Set(["profile", "messages"]);

const TITLES: Record<string, string> = {
  profile: "Your mentor profile",
  messages: "Messages",
};

type Props = { params: Promise<{ section: string }> };

export default async function MentorSectionPage({ params }: Props) {
  const { section } = await params;
  if (!SECTIONS.has(section)) notFound();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">
        {TITLES[section] ?? "Mentor"}
      </h1>
      <MentorSectionContent section={section} />
    </div>
  );
}
