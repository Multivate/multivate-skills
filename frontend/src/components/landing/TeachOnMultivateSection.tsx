import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function TeachOnMultivateSection() {
  const t = await getTranslations("landing.teach");

  return (
    <section id="teach" className="section-y border-t border-brand-ink/10 bg-brand-muted">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-20">
          <div>
            <p className="tag-overline">{t("kicker")}</p>
            <h2 className="heading-section mt-4 text-3xl sm:text-4xl">{t("title")}</h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-ink/65">{t("body")}</p>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-ink">{t("bullet1Title")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-ink/65">{t("bullet1Body")}</p>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-ink">{t("bullet2Title")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-ink/65">{t("bullet2Body")}</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/register?intent=instructor"
                className="btn-primary-brand inline-flex items-center justify-center gap-2 sm:w-auto"
              >
                {t("ctaInstructor")}
              </Link>
              <Link href="/login?from=%2Fdashboard%2Finstructor%2Fstudio" className="btn-outline-brand sm:w-auto">
                {t("ctaStudio")}
              </Link>
            </div>
          </div>

          <aside className="border-t border-brand-ink/15 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-brand-ink/45">
              {t("panelTitle")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-brand-ink/65">{t("panelBody")}</p>
            <ul className="mt-6 space-y-4 text-sm text-brand-ink/80">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" aria-hidden />
                {t("panelLi1")}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" aria-hidden />
                {t("panelLi2")}
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" aria-hidden />
                {t("panelLi3")}
              </li>
            </ul>
            <Link href="/courses" className="mt-8 inline-flex text-sm font-semibold text-brand-accent hover:text-brand-accent-dark">
              {t("ctaBrowse")}
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
