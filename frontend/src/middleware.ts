import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  if (response.status >= 300 && response.status < 400) {
    return response;
  }
  if (response.headers.get("location")) {
    return response;
  }

  const dash = pathname.match(/^\/(en|fr|de|es)\/dashboard(\/|$)/);
  if (dash && !request.cookies.get("access_token")) {
    const loc = dash[1];
    const login = new URL(`/${loc}/login`, request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
