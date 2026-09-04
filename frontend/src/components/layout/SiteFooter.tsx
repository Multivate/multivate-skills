import {
  Facebook,
  Instagram,
  Linkedin,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./LogoMark";

const socialBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/15 text-white/70 transition hover:border-brand-accent hover:text-brand-accent";

const quickLinkKeys = ["qlCourses", "qlGerman", "qlOrgs", "qlResources", "qlBlog", "qlCareers"] as const;
const companyKeys = ["coAbout", "coMission", "coStories", "coPartners", "coContact"] as const;
const supportKeys = ["suHelp", "suFaq", "suCommunity", "suSupport", "suPrivacy", "suTerms"] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tCommon = await getTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer id="about" className="w-full bg-brand-ink text-white">
      <div className="border-b border-white/10">
        <div className="container-page py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <LogoMark variant="inverse" className="max-h-9 max-w-[11rem]" />
              <h2 className="mt-8 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("ctaTitle")}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
                {t("ctaBody")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link href="/register" className="btn-primary-brand sm:w-auto">
                {tCommon("getStartedNow")}
              </Link>
              <Link href="#courses" className="btn-outline-light sm:w-auto">
                {tCommon("exploreCourses")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="max-w-[18rem] text-sm leading-relaxed text-white/60">{t("tagline")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="#" aria-label="Facebook" className={socialBtn}>
                <Facebook className="h-[1.05rem] w-[1.05rem]" />
              </Link>
              <Link href="#" aria-label="Twitter" className={socialBtn}>
                <Twitter className="h-[1.05rem] w-[1.05rem]" />
              </Link>
              <Link href="#" aria-label="LinkedIn" className={socialBtn}>
                <Linkedin className="h-[1.05rem] w-[1.05rem]" />
              </Link>
              <Link href="#" aria-label="Instagram" className={socialBtn}>
                <Instagram className="h-[1.05rem] w-[1.05rem]" />
              </Link>
              <Link href="#" aria-label="YouTube" className={socialBtn}>
                <Youtube className="h-[1.05rem] w-[1.05rem]" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t("quickLinks")}</h3>
            <ul className="mt-4 space-y-2.5">
              {quickLinkKeys.map((key) => (
                <li key={key}>
                  <Link href="#" className="text-sm text-white/70 transition hover:text-white">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t("company")}</h3>
            <ul className="mt-4 space-y-2.5">
              {companyKeys.map((key) => (
                <li key={key}>
                  <Link href="#" className="text-sm text-white/70 transition hover:text-white">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t("support")}</h3>
            <ul className="mt-4 space-y-2.5">
              {supportKeys.map((key) => (
                <li key={key}>
                  <Link
                    href={key === "suPrivacy" ? "/privacy" : key === "suTerms" ? "/terms" : "#"}
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{t("newsletter")}</h3>
            <p className="mt-4 text-sm leading-relaxed text-white/60">{t("newsletterBody")}</p>
            <form
              className="mt-4 flex w-full items-stretch overflow-hidden rounded-md border border-white/15 bg-white/5 focus-within:border-brand-accent"
              action="#"
              method="post"
            >
              <input
                type="email"
                name="email"
                placeholder={t("emailPlaceholder")}
                className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                className="flex w-12 shrink-0 items-center justify-center bg-brand-accent text-white transition hover:bg-brand-accent-dark"
                aria-label={t("subscribeAria")}
              >
                <Send className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <p className="text-center text-xs font-medium text-white/45">{tCommon("copyright", { year })}</p>
      </div>
    </footer>
  );
}
