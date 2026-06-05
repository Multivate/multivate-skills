import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  return forwardAuthenticatedUpstream(`/api/v1/admin/payments/${encodeURIComponent(id)}/reject`, {
    method: "PATCH",
    jsonBody: body,
  });
}
