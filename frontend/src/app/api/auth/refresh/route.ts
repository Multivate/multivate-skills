import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";

const secure = process.env.NODE_ENV === "production";

/** Rotate JWTs using the httpOnly refresh cookie (optional client call; /me also rotates on 401). */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const refresh = cookieStore.get("refresh_token")?.value;
    if (!refresh) {
      return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
    }
    const base = getInternalApiUrl();
    const upstream = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const res = NextResponse.json(data, { status: upstream.status });
      if (upstream.status === 401) {
        clearAuthCookies(res, secure);
      }
      return res;
    }
    const access = data.access_token as string | undefined;
    const newRefresh = data.refresh_token as string | undefined;
    if (!access || !newRefresh) {
      return NextResponse.json({ detail: "Invalid upstream response" }, { status: 502 });
    }
    const res = NextResponse.json({ ok: true });
    setAuthCookies(res, access, newRefresh, secure);
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
