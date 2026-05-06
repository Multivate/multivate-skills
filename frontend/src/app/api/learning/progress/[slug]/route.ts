import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ slug: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { slug } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
    }
    return await forwardAuthenticatedUpstream(`/api/v1/learning/progress/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      jsonBody: body,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "API proxy is not configured" }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
