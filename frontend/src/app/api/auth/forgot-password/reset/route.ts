import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const base = getInternalApiUrl();
  const upstream = await fetch(`${base}/api/v1/auth/forgot-password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (upstream.status === 204) return new NextResponse(null, { status: 204 });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
