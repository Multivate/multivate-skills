import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { courses, type CourseCategory } from "@/data/courses-catalog";
import { fetchBackendCatalog } from "@/lib/backend-courses";
import { Link } from "@/i18n/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coursesPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CoursesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coursesPage" });
  const tTabs = await getTranslations({ locale, namespace: "topCourses.tabs" });
  const tLessons = await getTranslations({ locale, namespace: "topCourses" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const live = await fetchBackendCatalog();
  const liveSlugs = new Set(live.map((c) => c.slug));
  const staticRest = courses.filter((c) => !liveSlugs.has(c.slug));

  function categoryLabel(cat: CourseCategory): string {
    return tTabs(cat);
  }

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
              {t("breadcrumbHome")}
            </Link>
            <span className="mx-2 text-slate-300" aria-hidden>
              /
            </span>
            <span className="text-slate-700">{t("breadcrumbCourses")}</span>
          </nav>

          <h1 className="heading-section mt-6 text-2xl sm:text-3xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {t("introLead")}{" "}
            <strong className="font-semibold text-slate-800">{t("introHighlight")}</strong> {t("introTrail")}
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((c) => (
              <li key={`api-${c.slug}`}>
                <Link
                  href={`/courses/${c.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-card transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-100">
                    <Image
                      src={c.image_url}
                      alt={c.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">{t("liveBadge")}</p>
                    <h2 className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">{c.title}</h2>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{c.description}</p>
                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      {tLessons("lessons", { count: c.lessons_count })}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
                      {tCommon("viewCourse")}
                      <span aria-hidden className="transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            {staticRest.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/courses/${c.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-card transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-100">
                    <Image
                      src={c.image}
                      alt={c.imageAlt}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                      sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">
                      {categoryLabel(c.category)}
                    </p>
                    <h2 className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">{c.title}</h2>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{c.description}</p>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-slate-900">{c.price}</span>
                      <span className="text-sm text-slate-400 line-through">{c.wasPrice}</span>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
                      {tCommon("viewCourse")}
                      <span aria-hidden className="transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
