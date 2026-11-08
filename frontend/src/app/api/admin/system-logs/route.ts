import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).search;
    return await forwardAuthenticatedUpstream(`/api/v1/admin/system-logs${query}`, { method: "GET" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
