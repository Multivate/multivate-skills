import { proxyRegisterPost } from "@/app/api/auth/register/_proxy";

export async function POST(req: Request) {
  return proxyRegisterPost(req, { role: "instructor", action: "verify" });
}
