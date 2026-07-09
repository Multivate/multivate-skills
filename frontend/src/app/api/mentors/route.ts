import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const featured = url.searchParams.get("featured") === "true";
    const limit = url.searchParams.get("limit") ?? "50";
    const res = await fetchInternal(`/api/v1/mentors?featured=${featured}&limit=${limit}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return handleProxyError(e);
  }
}
