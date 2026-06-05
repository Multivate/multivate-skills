import { createAuthenticatedProxy } from "@/app/api/_bffAuth";

const handler = createAuthenticatedProxy("studio");

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
