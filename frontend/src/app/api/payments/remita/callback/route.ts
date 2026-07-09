import { NextResponse } from "next/server";
import { fetchInternal } from "@/lib/internal-api";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const res = await fetchInternal("/api/v1/payments/remita/callback", {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
      },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return new NextResponse(message, { status: 500 });
  }
}
