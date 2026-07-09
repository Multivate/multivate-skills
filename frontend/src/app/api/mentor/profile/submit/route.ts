import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST() {
  try {
    return await forwardAuthenticatedUpstream("/api/v1/mentor/profile/submit", { method: "POST" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
