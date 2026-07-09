import type { PublicMentor } from "@/components/landing/MentorsSection";
import { fetchInternal } from "@/lib/internal-api";

export async function fetchPublicMentors(featured = false): Promise<PublicMentor[]> {
  try {
    const res = await fetchInternal(`/api/v1/mentors?featured=${featured}&limit=50`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchPublicMentor(slug: string) {
  try {
    const res = await fetchInternal(`/api/v1/mentors/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
