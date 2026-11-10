import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST(req: Request) {
  try {
    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
    }
    const record = jsonBody && typeof jsonBody === "object" ? (jsonBody as Record<string, unknown>) : {};
    const courseSlug = typeof record.course_slug === "string" ? record.course_slug.trim() : "";
    if (!courseSlug) {
      return NextResponse.json({ detail: "course_slug is required" }, { status: 400 });
    }
    return await forwardAuthenticatedUpstream("/api/v1/payments/checkout", {
      method: "POST",
      jsonBody: { course_slug: courseSlug },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "API proxy is not configured" }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
