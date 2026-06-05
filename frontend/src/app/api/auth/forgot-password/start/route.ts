import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const base = getInternalApiUrl();
  const upstream = await fetch(`${base}/api/v1/auth/forgot-password/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
