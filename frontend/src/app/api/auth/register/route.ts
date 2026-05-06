import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";

const secure = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    const base = getInternalApiUrl();
    const upstream = await fetch(`${base}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }
    const access = data.access_token as string | undefined;
    const refresh = data.refresh_token as string | undefined;
    const user = data.user;
    if (!access || !refresh || !user) {
      return NextResponse.json({ detail: "Invalid upstream response" }, { status: 502 });
    }
    const res = NextResponse.json({ user }, { status: 201 });
    setAuthCookies(res, access, refresh, secure);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "Auth proxy is not configured" }, { status: 500 });
    }
    const res = NextResponse.json({ detail: message }, { status: 500 });
    clearAuthCookies(res, secure);
    return res;
  }
}
