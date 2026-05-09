import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const { id } = await params;
  return forwardAuthenticatedUpstream(`/api/v1/messages/${encodeURIComponent(id)}/read`, { method: "PATCH" });
}
