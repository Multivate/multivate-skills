import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ slug: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { slug } = await params;
  return forwardAuthenticatedUpstream(`/api/v1/learning/wishlist/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}
