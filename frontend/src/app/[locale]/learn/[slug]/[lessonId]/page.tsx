import { CoursePlayer } from "@/components/player/CoursePlayer";

type Props = {
  params: Promise<{ slug: string; lessonId: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export default async function LearnLessonPage({ params, searchParams }: Props) {
  const { slug, lessonId } = await params;
  const { preview } = await searchParams;
  return <CoursePlayer slug={slug} lessonId={lessonId} preview={preview === "1"} />;
}
