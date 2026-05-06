import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CourseEnrollCta } from "@/components/courses/CourseEnrollCta";
import {
  courses,
  getCatalogCourseBySlug,
  type CourseCategory,
} from "@/data/courses-catalog";
import { fetchBackendCourse, fetchBackendLessons } from "@/lib/backend-courses";
import { Link } from "@/i18n/navigation";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

type DisplayCourse = {
  category: CourseCategory;
  title: string;
  description: string;
  detail: string;
  bullets: string[];
  pill: string;
  pillClass: string;
  level: string;
  lessons: number;
  hours: string;
  rating: string;
  reviews: string;
  instructor: string;
  price: string;
  wasPrice: string;
  image: string;
  imageAlt: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const live = await fetchBackendCourse(slug);
  const staticC = getCatalogCourseBySlug(slug);
  const title = live?.title ?? staticC?.title ?? "Course";
  const description = live?.description ?? staticC?.description ?? "";
  return {
    title: `${title} — Multivate`,
    description,
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug, locale } = await params;
  const tCourses = await getTranslations({ locale, namespace: "coursesPage" });
  const tDetail = await getTranslations({ locale, namespace: "courseDetail" });
  const tTabs = await getTranslations({ locale, namespace: "topCourses.tabs" });

  const live = await fetchBackendCourse(slug);
  const lessons = live ? await fetchBackendLessons(slug) : [];
  const staticC = getCatalogCourseBySlug(slug);
  if (!live && !staticC) notFound();

  let c: DisplayCourse;
  if (staticC) {
    c = {
      category: staticC.category,
      title: live?.title ?? staticC.title,
      description: live?.description ?? staticC.description,
      detail: live ? live.description : staticC.detail,
      bullets: [...staticC.bullets],
      pill: staticC.pill,
      pillClass: staticC.pillClass,
      level: staticC.level,
      lessons: live?.lessons_count ?? staticC.lessons,
      hours: staticC.hours,
      rating: staticC.rating,
      reviews: staticC.reviews,
      instructor: staticC.instructor,
      price: staticC.price,
      wasPrice: staticC.wasPrice,
      image: live?.image_url ?? staticC.image,
      imageAlt: live ? live.title : staticC.imageAlt,
    };
  } else {
    if (!live) notFound();
    c = {
      category: "web",
      title: live.title,
      description: live.description,
      detail: live.description,
      bullets: [live.description],
      pill: "Catalog",
      pillClass: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/90",
      level: "Self-paced",
      lessons: live.lessons_count,
      hours: "Flexible",
      rating: "—",
      reviews: "—",
      instructor: "Multivate",
      price: "Enroll with your account",
      wasPrice: "",
      image: live.image_url,
      imageAlt: live.title,
    };
  }

  const sortedLessons = [...lessons].sort((a, b) => a.position - b.position);

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
            <span className="line-clamp-1 text-slate-700">{c.title}</span>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">
                {tTabs(c.category)}
              </p>
              <h1 className="heading-section mt-2 text-2xl sm:text-3xl lg:text-[2rem]">{c.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{c.instructor}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-700">
                <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                  {c.rating}
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" strokeWidth={1.5} />
                </span>
                <span className="text-slate-500">
                  ({c.reviews} {tDetail("reviews")})
                </span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span className="font-medium text-slate-800">{c.level}</span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" strokeWidth={2} />
                  {c.hours} · {c.lessons} {tDetail("lessonsUnit")}
                </span>
              </div>

              <span
                className={`mt-4 inline-flex w-fit rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.pillClass}`}
              >
                {c.pill}
              </span>

              <p className="mt-6 text-base leading-relaxed text-slate-600">{c.detail}</p>

              <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-900">{tDetail("whatYouLearn")}</h2>
              <ul className="mt-3 space-y-3">
                {c.bullets.map((line) => (
                  <li key={line} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" strokeWidth={2.5} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

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
                <Image
                  src={c.image}
                  alt={c.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 22rem, 100vw"
                  priority
                />
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{c.price}</span>
                {c.wasPrice ? (
                  <span className="text-base text-slate-400 line-through">{c.wasPrice}</span>
                ) : null}
              </div>
              {live ? (
                <CourseEnrollCta courseSlug={live.slug} />
              ) : (
                <Link href="/register" className="btn-primary-brand mt-5 block w-full text-center !py-3">
                  {tDetail("getStarted")}
                </Link>
              )}
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
