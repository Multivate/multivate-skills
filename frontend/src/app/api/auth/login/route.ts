import { NextResponse } from "next/server";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

const secure = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    const upstream = await fetchInternal("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }
    if (
      data &&
      typeof data === "object" &&
      (data as { mfa_required?: unknown }).mfa_required === true &&
      typeof (data as { mfa_token?: unknown }).mfa_token === "string"
    ) {
      const d = data as { mfa_token: string; email_masked?: string; dev_otp?: string | null };
      return NextResponse.json({
        mfa_required: true,
        mfa_token: d.mfa_token,
        email_masked: typeof d.email_masked === "string" ? d.email_masked : "",
        ...(typeof d.dev_otp === "string" && d.dev_otp.length === 6 ? { dev_otp: d.dev_otp } : {}),
      });
    }
    const access = data.access_token as string | undefined;
    const refresh = data.refresh_token as string | undefined;
    const user = data.user;
    if (!access || !refresh || !user) {
      return NextResponse.json({ detail: "Invalid upstream response" }, { status: 502 });
    }
    const res = NextResponse.json({ user });
    setAuthCookies(res, access, refresh, secure);
    return res;
  } catch (e) {
    const res = handleProxyError(e);
    clearAuthCookies(res, secure);
    return res;
  }
}
