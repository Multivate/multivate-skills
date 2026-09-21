import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET() {
  return forwardAuthenticatedUpstream("/api/v1/learning/weekly-target");
}

export async function PATCH(req: Request) {
  try {
    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
    }
    return await forwardAuthenticatedUpstream("/api/v1/learning/weekly-target", {
      method: "PATCH",
      jsonBody,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
