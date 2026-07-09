import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type RouteContext = { params: Promise<{ reference: string }> };

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { reference } = await context.params;
    return await forwardAuthenticatedUpstream(
      `/api/v1/payments/remita/refresh/${encodeURIComponent(reference)}`,
      { method: "POST" },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
