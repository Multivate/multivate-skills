import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET() {
  return forwardAuthenticatedUpstream("/api/v1/support/tickets", { method: "GET" });
}

export async function POST(req: Request) {
  try {
    const jsonBody = await req.json();
    return await forwardAuthenticatedUpstream("/api/v1/support/tickets", { method: "POST", jsonBody });
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }
}
