import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";
import { cookies } from "next/headers";
import { getInternalApiUrl } from "@/lib/internal-api";

export async function GET() {
  try {
    return await forwardAuthenticatedUpstream("/api/v1/mentor/profile", { method: "GET" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const jsonBody = await req.json();
    return await forwardAuthenticatedUpstream("/api/v1/mentor/profile", { method: "PATCH", jsonBody });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
