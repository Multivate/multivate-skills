import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { fetchBackendCatalog } from "@/lib/backend-courses";
import { formatCoursePrice } from "@/lib/course-price";
import { Link } from "@/i18n/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
};

function matchesSearch(query: string, title: string, description: string, slug: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const s = slug.toLowerCase();
  return t.includes(needle) || d.includes(needle) || s.includes(needle);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coursesPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function CoursesIndexPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const rawSearch = typeof sp.search === "string" ? sp.search : "";
  const searchQ = rawSearch.trim();

  const t = await getTranslations({ locale, namespace: "coursesPage" });
  const tLessons = await getTranslations({ locale, namespace: "topCourses" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const courses = await fetchBackendCatalog();
  const filtered = searchQ
    ? courses.filter((c) => matchesSearch(searchQ, c.title, c.description, c.slug))
    : courses;

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

          {searchQ ? (
            <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm dark:border-slate-800/90 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-slate-700">
                <span className="font-semibold text-brand-ink">{t("searchActiveLabel")}</span>{" "}
                <q className="text-brand-primary">{searchQ}</q> ({t("searchResultCount", { count: filtered.length })})
              </p>
              <Link href="/courses" className="shrink-0 font-semibold text-brand-primary hover:text-brand-primary-dark">
                {t("searchClear")}
              </Link>
            </div>
          ) : null}

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/courses/${c.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-card transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-100">
                    <CourseThumbnail
                      src={c.image_url}
                      alt={c.title}
                      sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">{t("liveBadge")}</p>
                    <h2 className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">{c.title}</h2>
                    {c.subtitle ? (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{c.subtitle}</p>
                    ) : null}
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{c.description}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-700">
                        {tLessons("lessons", { count: c.lessons_count })}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900">
                        {formatCoursePrice(c.price_cents ?? 0, c.currency ?? "NGN", c.is_free ?? false)}
                      </p>
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

          {filtered.length === 0 ? (
            <p className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40">
              {searchQ ? t("searchNoResults") : t("emptyCatalog")}
            </p>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
