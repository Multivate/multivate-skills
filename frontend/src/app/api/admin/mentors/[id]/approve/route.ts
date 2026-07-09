import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Props = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Props) {
  try {
    const { id } = await params;
    return await forwardAuthenticatedUpstream(`/api/v1/admin/mentors/${encodeURIComponent(id)}/approve`, { method: "POST" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
