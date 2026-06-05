import { NextResponse } from "next/server";

export const PUBLIC_REVALIDATE_SECONDS = 60;

export const PUBLIC_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export function publicUpstreamInit(): RequestInit {
  return {
    headers: { Accept: "application/json" },
    next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
  };
}

export function withPublicCache(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  return res;
}
