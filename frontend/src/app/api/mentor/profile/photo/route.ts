import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ detail: "Photo file is required." }, { status: 422 });
    }
    const upstream = new FormData();
    upstream.append("file", file);
    const res = await fetch(`${getInternalApiUrl()}/api/v1/mentor/profile/photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      body: upstream,
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
