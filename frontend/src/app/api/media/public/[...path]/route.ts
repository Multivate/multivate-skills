import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

type Props = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Props) {
  try {
    const segments = (await params).path ?? [];
    const upstream = await fetchInternal(`/api/v1/media/public/${segments.join("/")}`);
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({ detail: "Not found" }));
      return NextResponse.json(data, { status: upstream.status });
    }
    const blob = await upstream.blob();
    const ct = upstream.headers.get("Content-Type") ?? "image/jpeg";
    return new NextResponse(blob, {
      status: 200,
      headers: { "Content-Type": ct, "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    return handleProxyError(e);
  }
}
