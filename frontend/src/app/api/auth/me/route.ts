import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET() {
  return forwardAuthenticatedUpstream("/api/v1/auth/me", { method: "GET" });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  return forwardAuthenticatedUpstream("/api/v1/auth/me", { method: "PATCH", jsonBody: body });
}
