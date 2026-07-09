import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

type Props = { params: Promise<{ conversationId: string }> };

export async function GET(req: Request, { params }: Props) {
  try {
    const { conversationId } = await params;
    const guestToken = new URL(req.url).searchParams.get("guest_token");
    const qs = guestToken ? `?guest_token=${encodeURIComponent(guestToken)}` : "";
    const authRes = await forwardAuthenticatedUpstream(
      `/api/v1/mentors/chat/${encodeURIComponent(conversationId)}/messages${qs}`,
      { method: "GET" },
    );
    if (authRes.status !== 401) return authRes;
    const res = await fetchInternal(
      `/api/v1/mentors/chat/${encodeURIComponent(conversationId)}/messages${qs}`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return handleProxyError(e);
  }
}

export async function POST(req: Request, { params }: Props) {
  try {
    const { conversationId } = await params;
    const jsonBody = await req.json();
    const authRes = await forwardAuthenticatedUpstream(
      `/api/v1/mentors/chat/${encodeURIComponent(conversationId)}/messages`,
      { method: "POST", jsonBody },
    );
    if (authRes.status !== 401) return authRes;
    const res = await fetchInternal(`/api/v1/mentors/chat/${encodeURIComponent(conversationId)}/messages`, {
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
