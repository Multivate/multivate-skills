/** Server-only: FastAPI base URL for Next.js route handlers (BFF → backend). */

import { NextResponse } from "next/server";

const DEFAULT_DEV_API = "http://127.0.0.1:8000";

/**
 * Paste your Render web service URL here (Dashboard → Web Service → URL).
 * Used in production when INTERNAL_API_URL is not set on Vercel.
 */
const HARDCODED_PRODUCTION_API = "https://multivate-vv3f.onrender.com";

const UPSTREAM_TIMEOUT_MS = 28_000;

const UPSTREAM_UNAVAILABLE =
  "We couldn't reach the learning server. Please try again in a moment.";

export class UpstreamConnectionError extends Error {
  constructor(readonly apiBase: string) {
    super(`Cannot reach API at ${apiBase}`);
    this.name = "UpstreamConnectionError";
  }
}

function isLocalApiUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("localhost") || lower.includes("127.0.0.1");
}

export function getInternalApiUrl(): string {
  const fromEnv = process.env.INTERNAL_API_URL?.trim();
  const hardcoded = HARDCODED_PRODUCTION_API.trim();

  if (process.env.NODE_ENV === "development") {
    if (fromEnv) return normalizeApiBase(fromEnv);
    return DEFAULT_DEV_API;
  }

  // Production: ignore mistaken localhost env on Vercel; prefer hardcoded Render URL.
  if (fromEnv && !isLocalApiUrl(fromEnv)) {
    return normalizeApiBase(fromEnv);
  }
  if (hardcoded) {
    return normalizeApiBase(hardcoded);
  }
  throw new Error(
    "INTERNAL_API_URL is not set. Add your Render API URL in Vercel environment variables.",
  );
}

function normalizeApiBase(url: string): string {
  return url.replace(/\/$/, "");
}

/** Server-side fetch to FastAPI with timeout (Render free tier cold starts). */
export async function fetchInternal(path: string, init?: RequestInit): Promise<Response> {
  const base = getInternalApiUrl();
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  try {
    return await fetch(url, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[fetchInternal] upstream request failed", url, err);
    throw new UpstreamConnectionError(base);
  }
}

export function handleProxyError(e: unknown): NextResponse {
  if (e instanceof UpstreamConnectionError) {
    return NextResponse.json({ detail: UPSTREAM_UNAVAILABLE }, { status: 502 });
  }
  const message = e instanceof Error ? e.message : "";
  if (message.includes("INTERNAL_API_URL") || message.includes("localhost")) {
    return NextResponse.json(
      {
        detail:
          "Sign-in is not connected to the server yet. Set INTERNAL_API_URL on Vercel to your Render API URL.",
      },
      { status: 503 },
    );
  }
  console.error("[auth proxy] unhandled error", e);
  return NextResponse.json({ detail: UPSTREAM_UNAVAILABLE }, { status: 502 });
}
