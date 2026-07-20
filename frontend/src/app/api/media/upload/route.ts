import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getInternalApiUrl } from "@/lib/internal-api";

/**
 * BFF proxy: POST /api/media/upload?folder=xxx&subfolder=yyy
 *
 * Reads the httpOnly access_token cookie, appends it as a Bearer token, and
 * forwards the multipart/form-data request to the FastAPI backend.
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("access_token")?.value;
    if (!access) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }

    // Forward the query string (folder, subfolder) to the upstream URL
    const { searchParams } = new URL(req.url);
    const upstreamUrl = new URL(`${getInternalApiUrl()}/api/v1/media/upload`);
    searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v));

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ detail: "A file is required." }, { status: 422 });
    }

    const upstream = new FormData();
    upstream.append("file", file);

    const res = await fetch(upstreamUrl.toString(), {
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
