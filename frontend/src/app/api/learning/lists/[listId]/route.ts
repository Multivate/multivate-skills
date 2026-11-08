import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ listId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { listId } = await params;
  try {
    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
    }
    return await forwardAuthenticatedUpstream(`/api/v1/learning/lists/${encodeURIComponent(listId)}`, {
      method: "PATCH",
      jsonBody,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { listId } = await params;
  return forwardAuthenticatedUpstream(`/api/v1/learning/lists/${encodeURIComponent(listId)}`, {
    method: "DELETE",
  });
}
