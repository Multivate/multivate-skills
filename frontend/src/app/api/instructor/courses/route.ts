import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
    }
    return await forwardAuthenticatedUpstream("/api/v1/courses", {
      method: "POST",
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
