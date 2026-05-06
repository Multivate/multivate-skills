import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";

const secure = process.env.NODE_ENV === "production";

type UpstreamInit = RequestInit & { jsonBody?: unknown };

/**
 * Forwards a request to the FastAPI origin using access/refresh cookies (same pattern as `/api/learning/my-courses`).
 */
export async function forwardAuthenticatedUpstream(
  upstreamPath: string,
  init: UpstreamInit = {},
): Promise<NextResponse> {
  const { jsonBody, headers: hdr, body: _upstreamBody, ...rest } = init;
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

  const headers = new Headers(hdr);
  headers.set("Authorization", `Bearer ${access!}`);
  if (jsonBody !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const call = () => {
    const method = (rest.method as string | undefined)?.toUpperCase() ?? "GET";
    const payload =
      jsonBody !== undefined ? JSON.stringify(jsonBody) : _upstreamBody !== undefined ? _upstreamBody : undefined;
    const init: RequestInit = {
      ...rest,
      headers,
      cache: "no-store",
    };
    if (method !== "GET" && method !== "HEAD" && payload !== undefined) {
      init.body = payload;
    }
    return fetch(`${base}${upstreamPath}`, init);
  };

  if (!access) {
    if (!(await refreshPair())) {
      const res = NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
      clearAuthCookies(res, secure);
      return res;
    }
    headers.set("Authorization", `Bearer ${access!}`);
  }

  let upstream = await call();
  if (upstream.status === 401) {
    if (!(await refreshPair())) {
      const data = await upstream.json().catch(() => ({}));
      const res = NextResponse.json(data, { status: upstream.status });
      clearAuthCookies(res, secure);
      return res;
    }
    headers.set("Authorization", `Bearer ${access!}`);
    upstream = await call();
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
}
