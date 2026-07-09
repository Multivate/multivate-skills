import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  try {
    const { slug } = await params;
    const res = await fetchInternal(`/api/v1/mentors/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return handleProxyError(e);
  }
}
