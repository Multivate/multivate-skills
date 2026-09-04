import { CourseStudio } from "@/components/studio/CourseStudio";

type Props = { params: Promise<{ slug: string }> };

export default async function InstructorStudioEditPage({ params }: Props) {
  const { slug } = await params;
  return <CourseStudio initialSlug={slug} />;
}
