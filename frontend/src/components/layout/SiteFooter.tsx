import {
  ArrowRight,
  Facebook,
  GraduationCap,
  Instagram,
  Linkedin,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import footerHeroImage from "../../../public/footer-image.png";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./LogoMark";

const socialBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-100/90 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-brand-primary";

const quickLinkKeys = ["qlCourses", "qlGerman", "qlOrgs", "qlResources", "qlBlog", "qlCareers"] as const;
const companyKeys = ["coAbout", "coMission", "coStories", "coPartners", "coContact"] as const;
const supportKeys = ["suHelp", "suFaq", "suCommunity", "suSupport", "suPrivacy", "suTerms"] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tCommon = await getTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer id="about" className="w-full min-w-0">
      <div className="bg-brand-muted pt-12 sm:pt-16">
        <div className="mx-auto box-border w-full max-w-[min(100%,calc(100vw-1.25rem))] pb-10 sm:max-w-[min(100%,calc(100vw-2rem))] sm:pb-12 md:max-w-[min(100%,calc(100vw-2.5rem))] lg:max-w-[min(100%,calc(100vw-3rem))]">
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_-4px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80">
            <section aria-labelledby="footer-cta-heading">
              <div className="grid min-h-0 grid-cols-1 bg-[#152a52] lg:grid-cols-2 lg:min-h-[22rem] xl:min-h-[24rem]">
                <div className="relative z-10 flex flex-col justify-center px-8 py-10 sm:px-11 sm:py-12 lg:px-12 lg:py-14 xl:pl-14 xl:pr-8">
                  <div className="mb-6">
                    <LogoMark
                      variant="inverse"
                      className="max-h-8 max-w-[9.5rem] sm:max-h-9 sm:max-w-[11rem]"
                    />
                  </div>
                  <p className="flex items-center gap-3 text-sm font-semibold text-white">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white">
                      <GraduationCap className="h-[1.15rem] w-[1.15rem]" strokeWidth={2} />
                    </span>
                    {t("missionLine")}
                  </p>

                  <h2
                    id="footer-cta-heading"
                    className="mt-6 max-w-xl text-pretty font-sans text-[1.625rem] font-extrabold leading-[1.12] tracking-tight text-white sm:text-3xl lg:text-[2rem] xl:text-[2.25rem]"
                  >
                    {t("ctaTitle")}
                  </h2>
                  <p className="mt-4 max-w-lg text-sm font-normal leading-relaxed text-white/90 sm:text-[0.95rem]">
                    {t("ctaBody")}
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                    <Link
                      href="/register"
                      className="btn-primary-brand inline-flex h-12 w-full min-h-0 items-center justify-center px-8 py-0 sm:w-auto"
                    >
                      {tCommon("getStartedNow")}
                      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                    </Link>
                    <Link
                      href="#courses"
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl border-2 border-white bg-transparent px-8 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                    >
                      {tCommon("exploreCourses")}
                    </Link>
                  </div>
                </div>

                <div className="relative aspect-[5/3] min-h-[13.5rem] w-full sm:min-h-[15rem] lg:aspect-auto lg:min-h-full">
                  <div className="absolute inset-0 overflow-hidden lg:[clip-path:polygon(12%_0%,100%_0%,100%_100%,0_100%,0_88%,3.5%_74%,5.5%_58%,6.5%_42%,7.5%_26%,9%_12%,10.5%_0%)]">
                    <Image
                      src={footerHeroImage}
                      alt=""
                      fill
                      className="object-cover object-[center_24%] lg:object-[center_32%]"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      priority={false}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-slate-200/90 bg-[#fafbfc] px-6 py-12 sm:px-10 sm:py-14 lg:px-12 lg:py-16">
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-10 xl:gap-x-8 xl:gap-y-10">
                <div className="sm:col-span-2 lg:col-span-2">
                  <LogoMark className="max-h-10 max-w-[12rem] shrink-0" />
                  <p className="mt-4 max-w-[17rem] text-sm leading-relaxed text-slate-600">{t("tagline")}</p>
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
                  <h3 className="text-sm font-bold text-slate-900">{t("quickLinks")}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {quickLinkKeys.map((key) => (
                      <li key={key}>
                        <Link href="#" className="text-sm text-slate-600 transition hover:text-brand-primary">
                          {t(key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-1">
                  <h3 className="text-sm font-bold text-slate-900">{t("company")}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {companyKeys.map((key) => (
                      <li key={key}>
                        <Link href="#" className="text-sm text-slate-600 transition hover:text-brand-primary">
                          {t(key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-3">
                  <h3 className="text-sm font-bold text-slate-900">{t("support")}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {supportKeys.map((key) => (
                      <li key={key}>
                        <Link href="#" className="text-sm text-slate-600 transition hover:text-brand-primary">
                          {t(key)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-slate-200 pt-10 sm:col-span-2 sm:border-t-0 sm:pt-0 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 xl:pl-10">
                  <h3 className="text-sm font-bold text-slate-900">{t("newsletter")}</h3>
                  <p className="mt-4 max-w-none text-sm leading-relaxed text-slate-600">{t("newsletterBody")}</p>
                  <form
                    className="mt-4 flex w-full max-w-none items-stretch overflow-hidden rounded-xl border border-slate-300/90 bg-white shadow-sm focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20"
                    action="#"
                    method="post"
                  >
                    <input
                      type="email"
                      name="email"
                      placeholder={t("emailPlaceholder")}
                      className="min-w-0 flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-brand-ink outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      className="flex w-12 shrink-0 items-center justify-center bg-brand-primary text-white transition hover:bg-brand-primary-dark"
                      aria-label={t("subscribeAria")}
                    >
                      <Send className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative left-1/2 box-border w-screen max-w-[100vw] -translate-x-1/2 border-t border-slate-200 bg-slate-100 py-7 sm:py-8">
        <p className="text-center text-xs font-medium text-slate-600">{tCommon("copyright", { year })}</p>
      </div>
    </footer>
  );
}
