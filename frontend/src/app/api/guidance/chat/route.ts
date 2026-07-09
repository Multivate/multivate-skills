import { NextResponse } from "next/server";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

export async function POST(req: Request) {
  try {
    const jsonBody = await req.json();
    const res = await fetchInternal("/api/v1/guidance/chat", {
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
