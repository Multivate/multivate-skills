import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";

type Params = { params: Promise<{ slug: string }> };

/** Public proxy → FastAPI `GET /api/v1/courses/{slug}/lessons`. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const base = getInternalApiUrl();
    const upstream = await fetch(`${base}/api/v1/courses/${encodeURIComponent(slug)}/lessons`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await upstream.text();
    const res = new NextResponse(text, { status: upstream.status });
    res.headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message.includes("INTERNAL_API_URL")) {
      return NextResponse.json({ detail: "API proxy is not configured" }, { status: 500 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
