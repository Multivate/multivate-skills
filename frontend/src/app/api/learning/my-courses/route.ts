import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";

const secure = process.env.NODE_ENV === "production";

export async function GET() {
  try {
    const cookieStore = await cookies();
    let access = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!access && !refreshToken) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    const base = getInternalApiUrl();
    let rotated: { access: string; refresh: string } | null = null;

    const refreshPair = async (): Promise<boolean> => {
      if (!refreshToken) return false;
      const r = await fetch(`${base}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) return false;
      const a = body.access_token;
      const rf = body.refresh_token;
      if (typeof a !== "string" || typeof rf !== "string") return false;
      rotated = { access: a, refresh: rf };
      access = a;
      return true;
    };

    const callLearning = () =>
      fetch(`${base}/api/v1/learning/my-courses`, {
        headers: { Authorization: `Bearer ${access!}` },
        cache: "no-store",
      });

    if (!access) {
      if (!(await refreshPair())) {
        const res = NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
        clearAuthCookies(res, secure);
        return res;
      }
    }

    let upstream = await callLearning();
    if (upstream.status === 401) {
      if (!(await refreshPair())) {
        const data = await upstream.json().catch(() => ({}));
        const res = NextResponse.json(data, { status: upstream.status });
        clearAuthCookies(res, secure);
        return res;
      }
      upstream = await callLearning();
    }

    const data = await upstream.json().catch(() => []);
    const res = NextResponse.json(data, { status: upstream.status });
    const rotatedTokens = rotated as { access: string; refresh: string } | null;
    if (upstream.ok && rotatedTokens) {
      setAuthCookies(res, rotatedTokens.access, rotatedTokens.refresh, secure);
    } else if (upstream.status === 401) {
      clearAuthCookies(res, secure);
    }
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "API proxy is not configured" }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
