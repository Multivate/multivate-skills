import { NextResponse } from "next/server";

const DEFAULT_DEV_API = "http://127.0.0.1:8000";

const UPSTREAM_TIMEOUT_MS = 28_000;

const UPSTREAM_UNAVAILABLE =
  "We couldn't reach the server right now. Please try again in a moment.";

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

  if (process.env.NODE_ENV === "development") {
    if (fromEnv) return normalizeApiBase(fromEnv);
    return DEFAULT_DEV_API;
  }

  if (fromEnv && !isLocalApiUrl(fromEnv)) {
    return normalizeApiBase(fromEnv);
  }

  throw new Error(
    "INTERNAL_API_URL is not set. Configure it in the server environment.",
  );
}

function normalizeApiBase(url: string): string {
  return url.replace(/\/$/, "");
}

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
          "Sign-in is not connected yet. Please try again in a few minutes.",
      },
      { status: 503 },
    );
  }
  console.error("[auth proxy] unhandled error", e);
  return NextResponse.json({ detail: UPSTREAM_UNAVAILABLE }, { status: 502 });
}
