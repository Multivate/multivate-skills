import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  return forwardAuthenticatedUpstream(`/api/v1/classroom/feed${qs ? `?${qs}` : ""}`);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }
  return forwardAuthenticatedUpstream("/api/v1/classroom/feed", { method: "POST", jsonBody: body });
}
