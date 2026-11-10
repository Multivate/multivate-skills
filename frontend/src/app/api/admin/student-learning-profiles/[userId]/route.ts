import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const jsonBody = await req.json();
    return await forwardAuthenticatedUpstream(
      `/api/v1/admin/student-learning-profiles/${encodeURIComponent(userId)}`,
      { method: "PATCH", jsonBody },
    );
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }
}
