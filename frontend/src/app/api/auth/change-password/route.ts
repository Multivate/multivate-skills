import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await forwardAuthenticatedUpstream("/api/v1/auth/change-password", {
    method: "POST",
    jsonBody: body,
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return res;
}
