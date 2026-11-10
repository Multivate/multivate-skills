import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }
  return forwardAuthenticatedUpstream(`/api/v1/classroom/feed/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    jsonBody: body,
  });
}
