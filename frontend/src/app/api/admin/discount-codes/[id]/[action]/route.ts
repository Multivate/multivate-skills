import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Props = { params: Promise<{ id: string; action: string }> };

export async function PATCH(_req: Request, { params }: Props) {
  try {
    const { id, action } = await params;
    if (action !== "activate" && action !== "deactivate") {
      return NextResponse.json({ detail: "Not found" }, { status: 404 });
    }
    return await forwardAuthenticatedUpstream(`/api/v1/admin/discount-codes/${id}/${action}`, {
      method: "PATCH",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
