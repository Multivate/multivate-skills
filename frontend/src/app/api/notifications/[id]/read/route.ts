import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return forwardAuthenticatedUpstream(`/api/v1/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
}
