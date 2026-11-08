import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { fetchPublicMentors } from "@/lib/backend-mentors";
import { publicPageMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { MentorsDirectoryClient } from "./MentorsDirectoryClient";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const tMentors = await getTranslations({ locale, namespace: "mentors" });
  return publicPageMetadata({
    locale,
    path: "/mentors",
    title: t("mentorsTitle"),
    description: t("mentorsDescription") || tMentors("pageIntro"),
  });
}

export default async function MentorsPage() {
  const mentors = await fetchPublicMentors();
  const t = await getTranslations("mentors");

  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <section className="border-b border-brand-ink/10 bg-brand-muted py-12 sm:py-16">
          <div className="container-page max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">
              {t("pageTitle")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-brand-ink/70 sm:text-lg">{t("pageIntro")}</p>
          </div>
        </section>
        <MentorsDirectoryClient mentors={mentors} />
      </main>
      <SiteFooter />
    </>
  );
}
