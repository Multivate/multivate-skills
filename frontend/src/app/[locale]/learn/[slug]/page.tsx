import LearnCourseRedirect from "./LearnCourseRedirect";

type Props = { params: Promise<{ slug: string }> };

export default async function LearnCoursePage({ params }: Props) {
  const { slug } = await params;
  return <LearnCourseRedirect slug={slug} />;
}
