import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    const upstream = await fetchInternal("/api/v1/auth/login/mfa/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (e) {
    return handleProxyError(e);
  }
}
