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
    const upstream = await fetchInternal("/api/v1/auth/login/code/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }
    const d = data as { mfa_token?: string; email_masked?: string; dev_otp?: string | null };
    if (typeof d.mfa_token !== "string") {
      return NextResponse.json({ detail: "Invalid upstream response" }, { status: 502 });
    }
    return NextResponse.json({
      mfa_required: true,
      mfa_token: d.mfa_token,
      email_masked: typeof d.email_masked === "string" ? d.email_masked : "",
      ...(typeof d.dev_otp === "string" && d.dev_otp.length === 6 ? { dev_otp: d.dev_otp } : {}),
    });
  } catch (e) {
    return handleProxyError(e);
  }
}
