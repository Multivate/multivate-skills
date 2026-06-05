import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CourseEnrollCta } from "@/components/courses/CourseEnrollCta";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { fetchBackendCourse, fetchBackendLessons } from "@/lib/backend-courses";
import { formatCourseDuration, formatCoursePrice } from "@/lib/course-price";
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
  const { slug } = await params;
  const course = await fetchBackendCourse(slug);
  if (!course) {
    return { title: "Course - Multivate" };
  }
  return {
    title: `${course.title} - Multivate`,
    description: course.description,
  };
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
  const priceLabel = formatCoursePrice(
    course.price_cents ?? 0,
    course.currency ?? "NGN",
    course.is_free ?? false,
  );
  const durationLabel = formatCourseDuration(course.duration_minutes ?? 0);
  const levelLabel = course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : "All levels";

  return (
    <>
      <SiteHeader />
      <main className="section-y surface-section">
        <div className="container-page">
          <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
            <Link
              href="/"
              className="font-semibold text-brand-primary transition hover:text-brand-primary-dark"
            >
              {tCourses("breadcrumbHome")}
            </Link>
            <span className="mx-2 text-slate-300" aria-hidden>
              /
            </span>
            <Link
              href="/courses"
              className="font-semibold text-brand-primary transition hover:text-brand-primary-dark"
            >
              {tCourses("breadcrumbCourses")}
            </Link>
            <span className="mx-2 text-slate-300" aria-hidden>
              /
            </span>
            <span className="line-clamp-1 text-slate-700">{course.title}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">
                {categoryLabel(course.category, tTabs)}
              </p>
              <h1 className="heading-section mt-2 text-2xl sm:text-3xl lg:text-[2rem]">{course.title}</h1>
              {course.subtitle ? <p className="mt-2 text-base text-slate-600">{course.subtitle}</p> : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-700">
                <span className="font-medium text-slate-800">{levelLabel}</span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" strokeWidth={2} />
                  {durationLabel} · {course.lessons_count} {tDetail("lessonsUnit")}
                </span>
              </div>

              <p className="mt-6 text-base leading-relaxed text-slate-600">{course.description}</p>

              {bullets.length > 0 ? (
                <>
                  <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-900">
                    {tDetail("whatYouLearn")}
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {bullets.map((line) => (
                      <li key={line} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {sortedLessons.length > 0 ? (
                <>
                  <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-slate-900">{tDetail("curriculum")}</h2>
                  <p className="mt-1 text-xs text-slate-500">{tDetail("curriculumHint")}</p>
                  <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                    {sortedLessons.map((lesson) => (
                      <li key={lesson.id} className="pl-1">
                        <span className="font-semibold text-slate-900">{lesson.title}</span>
                        {lesson.duration_minutes > 0 ? (
                          <span className="text-slate-500"> · {lesson.duration_minutes} min</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </div>

            <aside className="rounded-2xl border border-slate-200/95 bg-white p-6 shadow-card lg:sticky lg:top-24">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
                <CourseThumbnail
                  src={course.image_url}
                  alt={course.title}
                  sizes="(min-width: 1024px) 22rem, 100vw"
                  className="object-cover"
                />
              </div>
              <p className="mt-5 text-2xl font-extrabold text-slate-900">{priceLabel}</p>
              <CourseEnrollCta courseSlug={course.slug} />
              <Link
                href="/dashboard/courses"
                className="mt-4 block text-center text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
              >
                {tDetail("myCoursesDashboard")}
              </Link>
              <Link
                href="/courses"
                className="mt-2 block text-center text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
              >
                ← {tDetail("backToAll")}
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
