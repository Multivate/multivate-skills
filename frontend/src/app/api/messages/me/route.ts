import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function GET() {
  return forwardAuthenticatedUpstream("/api/v1/messages/me");
}
