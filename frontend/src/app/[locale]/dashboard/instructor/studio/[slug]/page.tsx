import { Link } from "@/i18n/navigation";
import { CourseStudio } from "@/components/studio/CourseStudio";

type Props = { params: Promise<{ slug: string }> };

export default async function InstructorStudioEditPage({ params }: Props) {
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/dashboard/instructor/studio" className="inline-flex items-center text-sm font-semibold text-brand-primary hover:underline">
        ← All courses
      </Link>
      <CourseStudio initialSlug={slug} />
    </div>
  );
}
