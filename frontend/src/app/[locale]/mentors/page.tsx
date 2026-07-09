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
      <main className="bg-white dark:bg-slate-950">
        <section className="border-b border-slate-100 bg-slate-50 py-14 dark:border-slate-800 dark:bg-slate-900">
          <div className="container-page max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-accent">{t("eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-ink dark:text-white sm:text-4xl">
              {t("pageTitle")}
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{t("pageIntro")}</p>
          </div>
        </section>
        <MentorsDirectoryClient mentors={mentors} />
      </main>
      <SiteFooter />
    </>
  );
}
