import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const localDate = url.searchParams.get("local_date") ?? "";
  return forwardAuthenticatedUpstream(`/api/v1/learning/habits?local_date=${encodeURIComponent(localDate)}`);
}

export async function PATCH(req: Request) {
  try {
    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
    }
    const url = new URL(req.url);
    const localDate = url.searchParams.get("local_date") ?? "";
    return await forwardAuthenticatedUpstream(
      `/api/v1/learning/habits?local_date=${encodeURIComponent(localDate)}`,
      { method: "PATCH", jsonBody },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
