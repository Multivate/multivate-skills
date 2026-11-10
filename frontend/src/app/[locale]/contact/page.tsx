import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicPageMetadata, SITE_EMAIL, SITE_LEGAL_NAME, SITE_NAME } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contactPage" });
  return publicPageMetadata({
    locale,
    path: "/contact",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contactPage" });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: t("title"),
          url: absoluteUrl(locale, "/contact"),
          mainEntity: {
            "@type": "EducationalOrganization",
            name: SITE_NAME,
            legalName: SITE_LEGAL_NAME,
            email: SITE_EMAIL,
          },
        }}
      />
      <SiteHeader />
      <main id="main-content" className="bg-white py-12 sm:py-16">
        <article className="container-page max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-600">{t("intro")}</p>

          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-sm font-semibold text-brand-ink">{t("emailLabel")}</dt>
              <dd className="mt-1">
                <a href={`mailto:${SITE_EMAIL}`} className="text-brand-accent hover:text-brand-accent-dark">
                  {SITE_EMAIL}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-ink">{t("campusLabel")}</dt>
              <dd className="mt-1 text-neutral-600">{t("campusValue")}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-ink">{t("legalLabel")}</dt>
              <dd className="mt-1 text-neutral-600">{SITE_LEGAL_NAME}</dd>
            </div>
          </dl>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
