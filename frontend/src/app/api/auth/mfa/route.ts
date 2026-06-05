import { proxyMfaLoginComplete } from "@/app/api/auth/_mfaLoginComplete";

/** Flat alias for MFA completion (avoids nested `/login/mfa` routing issues in some setups). */
export async function POST(req: Request) {
  return proxyMfaLoginComplete(req);
}
