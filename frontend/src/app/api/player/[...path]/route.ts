import { createAuthenticatedProxy } from "@/app/api/_bffAuth";

const handler = createAuthenticatedProxy("player");

export const GET = handler;
export const POST = handler;
