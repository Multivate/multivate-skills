import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  try {
    const { id } = await params;
    return await forwardAuthenticatedUpstream(
      `/api/v1/mentor/conversations/${encodeURIComponent(id)}/messages`,
      { method: "GET" },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const jsonBody = await req.json();
    return await forwardAuthenticatedUpstream(
      `/api/v1/mentor/conversations/${encodeURIComponent(id)}/messages`,
      { method: "POST", jsonBody },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
