import { ClassroomListenAlone } from "@/components/player/ClassroomListenAlone";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export default async function ListenAlonePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  return <ClassroomListenAlone slug={slug} preview={query.preview === "1" || query.preview === "true"} />;
}
