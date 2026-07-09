import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

type Props = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Props) {
  try {
    const { slug } = await params;
    const jsonBody = await req.json();
    const authRes = await forwardAuthenticatedUpstream(
      `/api/v1/mentors/${encodeURIComponent(slug)}/conversations`,
      { method: "POST", jsonBody },
    );
    if (authRes.status !== 401) return authRes;
    const res = await fetchInternal(`/api/v1/mentors/${encodeURIComponent(slug)}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return handleProxyError(e);
  }
}
