import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CourseEnrollCta } from "@/components/courses/CourseEnrollCta";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { fetchBackendCourse, fetchBackendLessons } from "@/lib/backend-courses";
import { CourseSalePrice } from "@/components/courses/CourseSalePrice";
import { formatCourseDuration, saleIsLive, salePriceCents } from "@/lib/course-price";
import { resolveCourseImageUrl } from "@/lib/course-image";
import { JsonLd } from "@/components/seo/JsonLd";
import { privateRobotsMetadata, publicPageMetadata, SITE_NAME, truncateMeta } from "@/lib/seo";
import { absoluteAssetUrl, absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

const TAB_IDS = new Set(["ai", "data", "cloud", "web", "design", "german", "career"]);

function learningBullets(objectives: string | null | undefined, description: string): string[] {
  if (objectives?.trim()) {
    const lines = objectives
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length > 0) return lines;
  }
  return description.trim() ? [description.trim()] : [];
}

function categoryLabel(
  category: string | undefined,
  tTabs: Awaited<ReturnType<typeof getTranslations>>,
): string {
  const key = (category ?? "general").toLowerCase();
  if (TAB_IDS.has(key)) return tTabs(key as "ai");
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const course = await fetchBackendCourse(slug);
  if (!course) {
    return privateRobotsMetadata("Course not found");
  }
  const image = absoluteAssetUrl(resolveCourseImageUrl(course.image_url));
  const description = truncateMeta(course.subtitle || course.description || course.title);
  return publicPageMetadata({
    locale,
    path: `/courses/${course.slug}`,
    title: course.title,
    description,
    image,
  });
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const tCourses = await getTranslations({ locale, namespace: "coursesPage" });
  const tDetail = await getTranslations({ locale, namespace: "courseDetail" });
  const tTabs = await getTranslations({ locale, namespace: "topCourses.tabs" });

  const course = await fetchBackendCourse(slug);
  if (!course) notFound();

  const lessons = await fetchBackendLessons(slug);
  const sortedLessons = [...lessons].sort((a, b) => a.position - b.position);
  const bullets = learningBullets(course.learning_objectives, course.description);
  const listCents = course.price_cents ?? 0;
  const liveSale = saleIsLive(course.discount_percent, course.discount_expires_at);
  const saleCents = liveSale
    ? (course.sale_price_cents ?? salePriceCents(listCents, course.discount_percent, course.discount_expires_at))
    : null;
  const durationLabel = formatCourseDuration(course.duration_minutes ?? 0);
  const levelLabel = course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : "All levels";

  const courseUrl = absoluteUrl(locale, `/courses/${course.slug}`);
  const image = absoluteAssetUrl(resolveCourseImageUrl(course.image_url));
  const price = ((saleCents ?? listCents) / 100).toFixed(2);
  const courseLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: courseUrl,
    inLanguage: course.language || locale,
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    offers: {
      "@type": "Offer",
      url: courseUrl,
      price,
      priceCurrency: course.currency || "NGN",
      availability: "https://schema.org/InStock",
    },
  };
  if (image) courseLd.image = image;
  if (course.instructor_name) {
    courseLd.instructor = { "@type": "Person", name: course.instructor_name };
  }
  if ((course.rating_count ?? 0) > 0 && course.average_rating) {
    courseLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: course.average_rating,
      ratingCount: course.rating_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <>
      <JsonLd
        data={[
          courseLd,
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: tCourses("breadcrumbHome"), item: absoluteUrl(locale, "/") },
              { "@type": "ListItem", position: 2, name: tCourses("breadcrumbCourses"), item: absoluteUrl(locale, "/courses") },
              { "@type": "ListItem", position: 3, name: course.title, item: courseUrl },
            ],
          },
        ]}
      />
      <SiteHeader />
      <main id="main-content" className="bg-white py-10 sm:py-14">
        <div className="container-page">
          <nav className="text-sm text-neutral-500" aria-label="Breadcrumb">
            <Link
              href="/"
              className="font-semibold text-brand-primary transition hover:text-brand-primary-dark"
            >
              {tCourses("breadcrumbHome")}
            </Link>
            <span className="mx-2 text-neutral-300" aria-hidden>
              /
            </span>
            <Link
              href="/courses"
              className="font-semibold text-brand-primary transition hover:text-brand-primary-dark"
            >
              {tCourses("breadcrumbCourses")}
            </Link>
            <span className="mx-2 text-neutral-300" aria-hidden>
              /
            </span>
            <span className="line-clamp-1 text-zinc-700">{course.title}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">
                {categoryLabel(course.category, tTabs)}
              </p>
              <h1 className="heading-section mt-2 text-2xl sm:text-3xl lg:text-[2rem]">{course.title}</h1>
              {course.subtitle ? <p className="mt-2 text-base text-neutral-500">{course.subtitle}</p> : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-700">
                <span className="font-medium text-zinc-800">{levelLabel}</span>
                <span className="text-neutral-300" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-neutral-500">
                  <Clock className="h-4 w-4 text-neutral-400" strokeWidth={2} />
                  {durationLabel} · {course.lessons_count} {tDetail("lessonsUnit")}
                </span>
              </div>

              <p className="mt-6 text-base leading-relaxed text-neutral-500">{course.description}</p>

              {bullets.length > 0 ? (
                <>
                  <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-zinc-900">
                    {tDetail("whatYouLearn")}
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {bullets.map((line) => (
                      <li key={line} className="flex gap-3 text-sm leading-relaxed text-zinc-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {sortedLessons.length > 0 ? (
                <>
                  <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-zinc-900">{tDetail("curriculum")}</h2>
                  <p className="mt-1 text-xs text-neutral-500">{tDetail("curriculumHint")}</p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
                    {sortedLessons.map((lesson) => (
                      <li key={lesson.id} className="pl-1">
                        <span className="font-semibold text-zinc-900">{lesson.title}</span>
                        {lesson.duration_minutes > 0 ? (
                          <span className="text-neutral-500"> · {lesson.duration_minutes} min</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </div>

            <aside className="overflow-hidden rounded-2xl border border-brand-ink/10 bg-white shadow-[0_16px_40px_rgba(12,27,74,0.06)] lg:sticky lg:top-24">
              <div className="w-full bg-brand-muted">
                <CourseThumbnail
                  src={course.image_url}
                  alt={course.title}
                  fit="contain"
                  sizes="(min-width: 1024px) 22rem, 100vw"
                  className="object-contain"
                />
              </div>
              <div className="space-y-4 p-6">
                <CourseSalePrice
                  priceCents={listCents}
                  currency={course.currency ?? "NGN"}
                  isFree={course.is_free ?? false}
                  discountPercent={course.discount_percent}
                  discountExpiresAt={course.discount_expires_at}
                  salePriceCentsOverride={course.sale_price_cents}
                  size="detail"
                />
                <CourseEnrollCta courseSlug={course.slug} />
                <div className="space-y-2 border-t border-brand-ink/10 pt-4">
                  <Link
                    href="/dashboard/courses"
                    className="block text-center text-sm font-semibold text-brand-accent transition hover:text-brand-accent-dark"
                  >
                    {tDetail("myCoursesDashboard")}
                  </Link>
                  <Link
                    href="/courses"
                    className="block text-center text-sm font-semibold text-brand-ink/55 transition hover:text-brand-ink"
                  >
                    {tDetail("backToAll")}
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
