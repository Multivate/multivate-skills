import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";

const secure = process.env.NODE_ENV === "production";

type Params = { params: Promise<{ slug: string }> };

/** Authenticated proxy → FastAPI `DELETE /api/v1/enrollments/{course_slug}`. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { slug } = await params;
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
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return false;
      const a = j.access_token;
      const rf = j.refresh_token;
      if (typeof a !== "string" || typeof rf !== "string") return false;
      rotated = { access: a, refresh: rf };
      access = a;
      return true;
    };

    const callUnenroll = () =>
      fetch(`${base}/api/v1/enrollments/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access!}` },
      });

    if (!access) {
      if (!(await refreshPair())) {
        const res = NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
        clearAuthCookies(res, secure);
        return res;
      }
    }

    let upstream = await callUnenroll();
    if (upstream.status === 401) {
      if (!(await refreshPair())) {
        const data = await upstream.json().catch(() => ({}));
        const res = NextResponse.json(data, { status: upstream.status });
        clearAuthCookies(res, secure);
        return res;
      }
      upstream = await callUnenroll();
    }

    let res: NextResponse;
    if (upstream.status === 204) {
      res = new NextResponse(null, { status: 204 });
    } else {
      const ct = upstream.headers.get("Content-Type") ?? "";
      if (ct.includes("application/json")) {
        const data = await upstream.json().catch(() => ({}));
        res = NextResponse.json(data, { status: upstream.status });
      } else {
        res = new NextResponse(await upstream.text(), { status: upstream.status });
      }
    }

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
