import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token")?.value;
  if (!access) return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });

  const formData = await req.formData();
  const base = getInternalApiUrl();
  const upstream = await fetch(`${base}/api/v1/auth/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
    body: formData,
    cache: "no-store",
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
