import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { fetchPublicMentors } from "@/lib/backend-mentors";
import { getTranslations } from "next-intl/server";
import { MentorsDirectoryClient } from "./MentorsDirectoryClient";

export default async function MentorsPage() {
  const mentors = await fetchPublicMentors();
  const t = await getTranslations("mentors");

  return (
    <>
      <SiteHeader />
      <main className="bg-brand-surface dark:bg-zinc-950">
        <section className="border-b border-neutral-100 bg-neutral-50 py-14 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="container-page max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-accent">{t("eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tighter text-brand-ink dark:text-white sm:text-4xl">
              {t("pageTitle")}
            </h1>
            <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400">{t("pageIntro")}</p>
          </div>
        </section>
        <MentorsDirectoryClient mentors={mentors} />
      </main>
      <SiteFooter />
    </>
  );
}
