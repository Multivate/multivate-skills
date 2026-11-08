import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { MentorsSection } from "@/components/landing/MentorsSection";
import { TeachOnMultivateSection } from "@/components/landing/TeachOnMultivateSection";
import { TopCoursesSection } from "@/components/landing/TopCoursesSection";
import { StorySections } from "@/components/landing/StorySections";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchBackendCatalog } from "@/lib/backend-courses";
import { fetchPublicMentors } from "@/lib/backend-mentors";
import { fetchBackendPublicReviews } from "@/lib/backend-reviews";
import { SITE_EMAIL, SITE_LEGAL_NAME, SITE_NAME } from "@/lib/seo";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const [courses, reviews, mentors] = await Promise.all([
    fetchBackendCatalog({ revalidate: 60 }),
    fetchBackendPublicReviews(),
    fetchPublicMentors(false),
  ]);
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
              logo: `${site}/MULTIVATE MAIN LOGO.png`,
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
      <main>
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
