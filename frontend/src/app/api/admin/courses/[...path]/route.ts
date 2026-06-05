import { createAuthenticatedProxy } from "@/app/api/_bffAuth";

const handler = createAuthenticatedProxy("admin/courses");

export const GET = handler;
export const POST = handler;
