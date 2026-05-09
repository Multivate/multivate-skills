import { ArrowRight, School, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function TeachOnMultivateSection() {
  const t = await getTranslations("landing.teach");

  return (
    <section id="teach" className="section-y border-t border-slate-200/80 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-900/40">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">{t("kicker")}</p>
            <h2 className="heading-section mt-3 text-2xl sm:text-3xl">{t("title")}</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">{t("body")}</p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-primary shadow-sm ring-1 ring-slate-200/90 dark:bg-slate-900 dark:ring-slate-700">
                  <School className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <p className="font-bold text-brand-ink">{t("bullet1Title")}</p>
                  <p className="mt-1 text-sm text-slate-600">{t("bullet1Body")}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-primary shadow-sm ring-1 ring-slate-200/90 dark:bg-slate-900 dark:ring-slate-700">
                  <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <p className="font-bold text-brand-ink">{t("bullet2Title")}</p>
                  <p className="mt-1 text-sm text-slate-600">{t("bullet2Body")}</p>
                </div>
              </li>
            </ul>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register?intent=instructor"
                className="btn-primary-brand inline-flex items-center justify-center gap-2 !py-3 sm:w-auto"
              >
                {t("ctaInstructor")}
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {t("ctaBrowse")}
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card dark:border-slate-800/90 dark:bg-slate-900 sm:p-8">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">{t("panelTitle")}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("panelBody")}</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" aria-hidden />
                {t("panelLi1")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" aria-hidden />
                {t("panelLi2")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" aria-hidden />
                {t("panelLi3")}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
