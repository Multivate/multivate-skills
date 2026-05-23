/** Server-only: FastAPI base URL for Next.js route handlers (BFF → backend). */

const DEFAULT_DEV_API = "http://127.0.0.1:8000";
/** Render web service name from `render.yaml` — change if your API URL is different. */
const DEFAULT_PRODUCTION_API = "https://multivate-api.onrender.com";

export function getInternalApiUrl(): string {
  const raw = process.env.INTERNAL_API_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return DEFAULT_DEV_API;
  }
  return DEFAULT_PRODUCTION_API;
}
