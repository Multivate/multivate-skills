import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET() {
  try {
    return await forwardAuthenticatedUpstream("/api/v1/instructor/dashboard", { method: "GET" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "We couldn't reach the server. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
