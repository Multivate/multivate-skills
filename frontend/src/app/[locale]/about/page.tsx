import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicPageMetadata, SITE_EMAIL, SITE_LEGAL_NAME, SITE_NAME } from "@/lib/seo";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutPage" });
  return publicPageMetadata({
    locale,
    path: "/about",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutPage" });
  const site = getSiteUrl();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: t("title"),
          url: absoluteUrl(locale, "/about"),
          mainEntity: {
            "@type": "EducationalOrganization",
            name: SITE_NAME,
            legalName: SITE_LEGAL_NAME,
            email: SITE_EMAIL,
            url: site,
          },
        }}
      />
      <SiteHeader />
      <main id="main-content" className="bg-white py-12 sm:py-16">
        <article className="container-page max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">{SITE_NAME}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-600">{t("intro")}</p>

          <h2 id="mission" className="mt-10 text-xl font-semibold text-brand-ink">
            {t("missionTitle")}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-neutral-600">{t("missionBody")}</p>

          <h2 className="mt-10 text-xl font-semibold text-brand-ink">{t("whoTitle")}</h2>
          <p className="mt-3 text-base leading-relaxed text-neutral-600">{t("whoBody")}</p>

          <h2 className="mt-10 text-xl font-semibold text-brand-ink">{t("whereTitle")}</h2>
          <p className="mt-3 text-base leading-relaxed text-neutral-600">{t("whereBody")}</p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/courses" className="btn-cta-accent inline-flex h-[50px] items-center px-8">
              {t("ctaCourses")}
            </Link>
            <Link href="/contact" className="inline-flex h-[50px] items-center text-[15px] font-medium text-brand-accent hover:text-brand-accent-dark">
              {t("ctaContact")}
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
