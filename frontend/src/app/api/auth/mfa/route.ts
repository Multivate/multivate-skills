import { proxyMfaLoginComplete } from "@/app/api/auth/_mfaLoginComplete";

export async function POST(req: Request) {
  return proxyMfaLoginComplete(req);
}
