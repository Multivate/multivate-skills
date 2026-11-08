import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ listId: string; slug: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { listId, slug } = await params;
  return forwardAuthenticatedUpstream(
    `/api/v1/learning/lists/${encodeURIComponent(listId)}/courses/${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
}
