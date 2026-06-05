import { Link } from "@/i18n/navigation";
import { CourseStudio } from "@/components/studio/CourseStudio";

export default function InstructorStudioNewPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/dashboard/instructor/studio" className="inline-flex items-center text-sm font-semibold text-brand-primary hover:underline">
        ← All courses
      </Link>
      <CourseStudio />
    </div>
  );
}
