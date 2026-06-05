import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ reference: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { reference } = await params;
  return forwardAuthenticatedUpstream(
    `/api/v1/payments/status/${encodeURIComponent(reference)}`,
  );
}
