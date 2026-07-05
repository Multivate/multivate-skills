import { getInternalApiUrl } from "@/lib/internal-api";

export type BackendCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  learning_objectives?: string | null;
  image_url: string;
  lessons_count: number;
  instructor_id: string | null;
  category?: string;
  level?: string;
  language?: string;
  duration_minutes?: number;
  price_cents?: number;
  currency?: string;
  is_free?: boolean;
  status?: string;
};

export type BackendLesson = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  body: string | null;
  duration_minutes: number;
};

export async function fetchBackendCatalog(): Promise<BackendCourse[]> {
  try {
    const base = getInternalApiUrl();
    const r = await fetch(`${base}/api/v1/courses`, { next: { revalidate: 60 } });
    if (!r.ok) return [];
    const data = (await r.json()) as unknown;
    return Array.isArray(data) ? (data as BackendCourse[]) : [];
  } catch {
    return [];
  }
}

export async function fetchBackendCourse(slug: string): Promise<BackendCourse | null> {
  try {
    const base = getInternalApiUrl();
    const r = await fetch(`${base}/api/v1/courses/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (r.status === 404) return null;
    if (!r.ok) return null;
    return (await r.json()) as BackendCourse;
  } catch {
    return null;
  }
}

export async function fetchBackendLessons(slug: string): Promise<BackendLesson[]> {
  try {
    const base = getInternalApiUrl();
    const r = await fetch(`${base}/api/v1/courses/${encodeURIComponent(slug)}/lessons`, {
      next: { revalidate: 60 },
    });
    if (!r.ok) return [];
    const data = (await r.json()) as unknown;
    return Array.isArray(data) ? (data as BackendLesson[]) : [];
  } catch {
    return [];
  }
}
