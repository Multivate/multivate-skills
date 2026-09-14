import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

type Props = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Props) {
  try {
    const segments = (await params).path ?? [];
    const joined = segments.join("/");
    const upstream = await fetchInternal(`/api/v1/media/public/${joined}`);
    if (!upstream.ok) {
      const data = await upstream.json().catch(() => ({ detail: "Not found" }));
      return NextResponse.json(data, { status: upstream.status });
    }
    const blob = await upstream.blob();
    const ct = upstream.headers.get("Content-Type") ?? "image/jpeg";
    // Phrase audio is replaced in place historically; avoid long-lived browser cache.
    const isPhraseAudio =
      joined.includes("/phrases/") || /\.(mp3|wav|ogg|webm|m4a|aac)(?:$|\?)/i.test(joined);
    const cacheControl = isPhraseAudio
      ? "private, no-cache, must-revalidate"
      : "public, max-age=86400";
    return new NextResponse(blob, {
      status: 200,
      headers: { "Content-Type": ct, "Cache-Control": cacheControl },
    });
  } catch (e) {
    return handleProxyError(e);
  }
}
