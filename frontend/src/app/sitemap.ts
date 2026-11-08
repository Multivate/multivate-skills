import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { fetchBackendCatalog } from "@/lib/backend-courses";
import { fetchPublicMentors } from "@/lib/backend-mentors";
import { absoluteUrl, getSiteUrl, localizedPath } from "@/lib/site-url";

const STATIC_PATHS = ["/", "/courses", "/mentors", "/privacy", "/terms"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, mentors] = await Promise.all([fetchBackendCatalog({ revalidate: 3600 }), fetchPublicMentors()]);
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      lastModified,
      changeFrequency: path === "/" ? "weekly" : "weekly",
      priority: path === "/" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((item) => [item, `${getSiteUrl()}${localizedPath(item, path)}`]),
        ),
      },
    })),
  );

  const courseEntries: MetadataRoute.Sitemap = courses.flatMap((course) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(locale, `/courses/${course.slug}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  );

  const mentorEntries: MetadataRoute.Sitemap = mentors.flatMap((mentor) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(locale, `/mentors/${mentor.slug}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  return [...staticEntries, ...courseEntries, ...mentorEntries];
}
