import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST(request: Request) {
  try {
    const jsonBody = await request.json().catch(() => ({}));
    return await forwardAuthenticatedUpstream("/api/v1/admin/security/authenticator/confirm", {
      method: "POST",
      jsonBody,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
