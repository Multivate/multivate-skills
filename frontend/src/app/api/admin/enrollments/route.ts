import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.toString();
    const path = q ? `/api/v1/admin/enrollments?${q}` : "/api/v1/admin/enrollments";
    return await forwardAuthenticatedUpstream(path, { method: "GET" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "API proxy is not configured" }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
