import { getInternalApiUrl } from "@/lib/internal-api";

export type PublicReview = {
  id: string;
  course_slug: string;
  course_title: string;
  reviewer_display_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export async function fetchBackendPublicReviews(limit = 12): Promise<PublicReview[]> {
  try {
    const base = getInternalApiUrl();
    const r = await fetch(`${base}/api/v1/reviews/public?limit=${limit}`, {
      next: { revalidate: 120 },
    });
    if (!r.ok) return [];
    const data = (await r.json()) as unknown;
    return Array.isArray(data) ? (data as PublicReview[]) : [];
  } catch {
    return [];
  }
}
