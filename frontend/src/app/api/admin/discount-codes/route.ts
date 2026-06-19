import { NextResponse } from "next/server";
import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET() {
  try {
    return await forwardAuthenticatedUpstream("/api/v1/admin/discount-codes", { method: "GET" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const jsonBody = await req.json();
    return await forwardAuthenticatedUpstream("/api/v1/admin/discount-codes", {
      method: "POST",
      jsonBody,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
