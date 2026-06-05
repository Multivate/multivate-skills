import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";
import { publicUpstreamInit, withPublicCache } from "@/lib/bff-cache";

type Params = { params: Promise<{ slug: string }> };

/** Public proxy → FastAPI `GET /api/v1/courses/{slug}/lessons`. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const base = getInternalApiUrl();
    const upstream = await fetch(`${base}/api/v1/courses/${encodeURIComponent(slug)}/lessons`, publicUpstreamInit());
    const text = await upstream.text();
    const res = new NextResponse(text, { status: upstream.status });
    res.headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
    return withPublicCache(res);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "We couldn't reach the server. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

/** Authenticated proxy → FastAPI `POST /api/v1/courses/{slug}/lessons` (course managers only). */
export async function POST(req: Request, { params }: Params) {
  try {
    const { slug } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
    }
    return await forwardAuthenticatedUpstream(`/api/v1/courses/${encodeURIComponent(slug)}/lessons`, {
      method: "POST",
      jsonBody: body,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "We couldn't reach the server. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
