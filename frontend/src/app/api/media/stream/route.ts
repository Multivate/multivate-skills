import { NextResponse } from "next/server";
import { getInternalApiUrl, handleProxyError } from "@/lib/internal-api";

const STREAM_TIMEOUT_MS = 300_000;

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ detail: "Missing token" }, { status: 400 });
    }

    const base = getInternalApiUrl();
    const upstreamUrl = `${base}/api/v1/media/stream?token=${encodeURIComponent(token)}`;
    const range = req.headers.get("range");

    const upstream = await fetch(upstreamUrl, {
      headers: range ? { Range: range } : undefined,
      signal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({ detail: "Unavailable" }));
      return NextResponse.json(data, { status: upstream.status });
    }

    const headers = new Headers();
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("Cache-Control", "no-store");
    headers.set("Content-Disposition", "inline");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (e) {
    return handleProxyError(e);
  }
}
