import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";
import { visitorForwardHeaders } from "@/lib/visitor-headers";
import { GEO_COOKIE } from "@/lib/visitor-geo";

export async function GET(req: Request) {
  try {
    const upstream = await fetchInternal("/api/v1/geo/visitor", {
      method: "GET",
      headers: visitorForwardHeaders(req.headers),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => ({}));
    const res = NextResponse.json(data, { status: upstream.status });
    const code =
      data && typeof data === "object" && typeof (data as { country_code?: unknown }).country_code === "string"
        ? String((data as { country_code: string }).country_code).toUpperCase()
        : "";
    if (upstream.ok && /^[A-Z]{2}$/.test(code)) {
      res.cookies.set(GEO_COOKIE, code, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 6,
      });
    }
    return res;
  } catch (e) {
    return handleProxyError(e);
  }
}
