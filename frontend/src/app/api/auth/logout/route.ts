import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/app/api/auth/_cookie";

const secure = process.env.NODE_ENV === "production";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res, secure);
  return res;
}
