import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { MentorsSection } from "@/components/landing/MentorsSection";
import { TeachOnMultivateSection } from "@/components/landing/TeachOnMultivateSection";
import { TopCoursesSection } from "@/components/landing/TopCoursesSection";
import { StorySections } from "@/components/landing/StorySections";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchBackendCatalog } from "@/lib/backend-courses";
import { isHiddenPublicCourse, sortCatalogCourses } from "@/lib/course-bundle";
import { fetchPublicMentors } from "@/lib/backend-mentors";
import { fetchBackendPublicReviews } from "@/lib/backend-reviews";
import { encodedAssetPath, SITE_EMAIL, SITE_LEGAL_NAME, SITE_NAME } from "@/lib/seo";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const [catalog, reviews, mentors] = await Promise.all([
    fetchBackendCatalog({ revalidate: 60 }),
    fetchBackendPublicReviews(),
    fetchPublicMentors(false),
  ]);
  const courses = sortCatalogCourses(
    catalog.filter((row) => !isHiddenPublicCourse(row.title || "", row.slug || "")),
  );
  const site = getSiteUrl();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "EducationalOrganization",
              "@id": `${site}/#organization`,
              name: SITE_NAME,
              legalName: SITE_LEGAL_NAME,
              url: site,
              email: SITE_EMAIL,
              logo: `${site}${encodedAssetPath("/MULTIVATE MAIN LOGO.png")}`,
            },
            {
              "@type": "WebSite",
              "@id": `${site}/#website`,
              url: absoluteUrl(locale, "/"),
              name: SITE_NAME,
              publisher: { "@id": `${site}/#organization` },
              inLanguage: locale,
              potentialAction: {
                "@type": "SearchAction",
                target: `${absoluteUrl(locale, "/courses")}?search={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }}
      />
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <TopCoursesSection initialCourses={courses} />
        <StorySections reviews={reviews} />
        <MentorsSection initialMentors={mentors} />
        <TeachOnMultivateSection />
      </main>
      <SiteFooter />
    </>
  );
}
