import { NextResponse } from "next/server";
import { clearAuthCookies, setAuthCookies } from "@/app/api/auth/_cookie";
import { fetchInternal, handleProxyError } from "@/lib/internal-api";

const secure = process.env.NODE_ENV === "production";

export type RegisterRoleAction = { role: "student" | "instructor"; action: "start" | "verify" };

export async function proxyRegisterPost(
  req: Request,
  { role, action }: RegisterRoleAction,
): Promise<NextResponse | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const upstreamPath = `/api/v1/auth/register/${role}/${action}`;

  try {
    const upstream = await fetchInternal(upstreamPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }
    if (action === "start") {
      return NextResponse.json(data, { status: 200 });
    }
    const access = data.access_token as string | undefined;
    const refresh = data.refresh_token as string | undefined;
    const user = data.user;
    if (!access || !refresh || !user) {
      return NextResponse.json({ detail: "Invalid upstream response" }, { status: 502 });
    }
    const res = NextResponse.json({ user }, { status: 201 });
    setAuthCookies(res, access, refresh, secure);
    return res;
  } catch (e) {
    const res = handleProxyError(e);
    clearAuthCookies(res, secure);
    return res;
  }
}
