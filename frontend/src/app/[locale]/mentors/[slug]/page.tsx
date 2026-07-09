import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MentorProfileClient } from "./MentorProfileClient";
import { fetchPublicMentor } from "@/lib/backend-mentors";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function MentorProfilePage({ params }: Props) {
  const { slug } = await params;
  const mentor = await fetchPublicMentor(slug);
  if (!mentor) notFound();

  return (
    <>
      <SiteHeader />
      <main className="bg-white dark:bg-slate-950">
        <MentorProfileClient mentor={mentor} />
      </main>
      <SiteFooter />
    </>
  );
}
