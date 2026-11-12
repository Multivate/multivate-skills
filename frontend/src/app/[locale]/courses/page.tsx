import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CatalogCourseCard } from "@/components/courses/CatalogCourseCard";
import { PackageCourseCard } from "@/components/courses/PackageCourseCard";
import { fetchBackendCatalog } from "@/lib/backend-courses";
import { GERMAN_PACKAGES, isHiddenPublicCourse, mixCatalogWithPackages, sortCatalogCourses } from "@/lib/course-bundle";
import { publicPageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string }>;
};

function searchNeedles(query: string): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const extras: Record<string, string[]> = {
    tech: ["technology", "cloud", "artificial", "data"],
    web: ["technology", "web"],
    data: ["data", "analytics"],
    career: ["career", "interview", "work"],
    german: ["german", "deutsch", "language"],
  };
  return [needle, ...(extras[needle] ?? [])];
}

function matchesSearch(
  query: string,
  title: string,
  description: string,
  slug: string,
  category?: string,
): boolean {
  const needles = searchNeedles(query);
  if (needles.length === 0) return true;
  const hay = `${title} ${description} ${slug} ${category ?? ""}`.toLowerCase();
  return needles.some((item) => hay.includes(item));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "coursesPage" });
  return publicPageMetadata({
    locale,
    path: "/courses",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function CoursesIndexPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const sp = await searchParams;
  const rawSearch = typeof sp.search === "string" ? sp.search : "";
  const searchQ = rawSearch.trim();

  const t = await getTranslations({ locale, namespace: "coursesPage" });
  const tTabs = await getTranslations({ locale, namespace: "topCourses.tabs" });

  const courses = sortCatalogCourses(
    (await fetchBackendCatalog({ revalidate: 60 })).filter(
      (row) => !isHiddenPublicCourse(row.title || "", row.slug || ""),
    ),
  );
  const filtered = searchQ
    ? courses.filter((c) => matchesSearch(searchQ, c.title, c.description, c.slug, c.category))
    : courses;
  const needle = searchQ.toLowerCase();
  const packages = !searchQ || /package|complete|german|a1|a2|b1|b2|c1|c2/.test(needle)
    ? GERMAN_PACKAGES.filter(
        (pkg) =>
          !searchQ ||
          `${pkg.title} ${pkg.range} package`.toLowerCase().includes(needle) ||
          /german|package/.test(needle),
      )
    : [];
  const mixed = mixCatalogWithPackages(filtered, packages);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-white py-12 sm:py-16">
        <div className="container-page">
          <nav className="text-sm text-neutral-500" aria-label="Breadcrumb">
            <Link
              href="/"
              className="font-semibold text-brand-primary transition hover:text-brand-primary-dark"
            >
              {t("breadcrumbHome")}
            </Link>
            <span className="mx-2 text-neutral-300" aria-hidden>
              /
            </span>
            <span className="text-zinc-700">{t("breadcrumbCourses")}</span>
          </nav>

          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            {t("introLead")}{" "}
            <strong className="font-semibold text-zinc-800">{t("introHighlight")}</strong> {t("introTrail")}
          </p>

          {searchQ ? (
            <div className="mt-6 flex flex-col gap-2 rounded-md border border-neutral-200/90 bg-brand-surface px-4 py-3 text-sm dark:border-zinc-800/90 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-zinc-700">
                <span className="font-semibold text-brand-ink">{t("searchActiveLabel")}</span>{" "}
                <q className="text-brand-primary">{searchQ}</q> ({t("searchResultCount", { count: filtered.length + packages.length })})
              </p>
              <Link href="/courses" className="shrink-0 font-semibold text-brand-primary hover:text-brand-primary-dark">
                {t("searchClear")}
              </Link>
            </div>
          ) : null}

          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {mixed.map((item) => {
              if (item.kind === "package") {
                return (
                  <li key={item.pkg.id}>
                    <PackageCourseCard pkg={item.pkg} catalog={courses} layout="grid" />
                  </li>
                );
              }
              const c = item.course;
              const catKey = (c.category ?? "general").toLowerCase();
              const categoryLabel = ["ai", "data", "cloud", "web", "design", "german", "career"].includes(catKey)
                ? tTabs(catKey as "ai")
                : c.category ?? undefined;
              return (
                <li key={c.slug}>
                  <CatalogCourseCard course={c} layout="grid" categoryLabel={categoryLabel} />
                </li>
              );
            })}
          </ul>

          {filtered.length === 0 && packages.length === 0 ? (
            <p className="mt-10 rounded-md border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-10 text-center text-sm text-neutral-500 dark:border-zinc-700 dark:bg-zinc-900/40">
              {searchQ ? t("searchNoResults") : t("emptyCatalog")}
            </p>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
