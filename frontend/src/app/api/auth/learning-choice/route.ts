import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return forwardAuthenticatedUpstream("/api/v1/auth/learning-choice", { method: "POST", jsonBody: body });
}
