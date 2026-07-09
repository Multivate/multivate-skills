import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  try {
    const { id } = await params;
    const jsonBody = await req.json();
    return await forwardAuthenticatedUpstream(`/api/v1/admin/mentors/${encodeURIComponent(id)}/feature`, {
      method: "PATCH",
      jsonBody,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
