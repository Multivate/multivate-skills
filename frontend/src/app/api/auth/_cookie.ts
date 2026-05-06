import type { NextResponse } from "next/server";

const ACCESS = "access_token";
const REFRESH = "refresh_token";

/** Match backend defaults: 30 min access, 14d refresh. */
const ACCESS_MAX_AGE = 60 * 30;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 14;

export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
  secure: boolean,
) {
  res.cookies.set(ACCESS, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookies.set(REFRESH, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res: NextResponse, secure: boolean) {
  res.cookies.set(ACCESS, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
  res.cookies.set(REFRESH, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 });
}
