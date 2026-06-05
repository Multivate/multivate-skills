import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let jsonBody: unknown = {};
  try {
    jsonBody = await req.json();
  } catch {
    jsonBody = {};
  }
  return forwardAuthenticatedUpstream(`/api/v1/admin/payments/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
    jsonBody,
  });
}
