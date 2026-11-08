import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST() {
  try {
    return await forwardAuthenticatedUpstream("/api/v1/admin/security/authenticator/start", { method: "POST" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
