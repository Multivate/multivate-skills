/** Server-only: FastAPI base URL for Next.js route handlers (BFF → backend). */

const DEFAULT_DEV_API = "http://127.0.0.1:8000";

export function getInternalApiUrl(): string {
  const raw = process.env.INTERNAL_API_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return DEFAULT_DEV_API;
  }
  throw new Error(
    "INTERNAL_API_URL is not set. Example: http://127.0.0.1:8000 (required in production builds).",
  );
}
