import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

export async function POST() {
  return forwardAuthenticatedUpstream("/api/v1/notifications/read-all", { method: "POST" });
}
