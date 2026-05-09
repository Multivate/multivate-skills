import { forwardAuthenticatedUpstream } from "@/app/api/_bffAuth";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { slug } = await params;
  return forwardAuthenticatedUpstream(`/api/v1/learning/certificates/${encodeURIComponent(slug)}/issue`, {
    method: "POST",
  });
}
