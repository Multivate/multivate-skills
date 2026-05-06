import { ArrowRight, GraduationCap, TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Hero right column — `public/landing logo.png` */
const HERO_MOCKUP = encodeURI("/landing logo.png");

const avatars = [
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=96&q=80",
];

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section className="relative overflow-hidden surface-section">
      <div className="container-page relative pb-[4.5rem] pt-11 sm:pb-24 sm:pt-14 lg:pb-28 lg:pt-16">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="max-w-copy lg:max-w-none lg:pr-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/90 bg-violet-50/90 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-primary sm:text-xs">
              <span aria-hidden className="text-brand-primary">
                +
              </span>
              {t("badge")}
            </div>

            <h1 className="heading-display mt-5 text-hero sm:mt-6 lg:mt-7 lg:text-hero-lg">
              {t("title")}{" "}
              <span className="text-brand-primary">{t("titleHighlight")}</span>
            </h1>

            <p className="mt-5 max-w-copy text-[1.05rem] leading-relaxed text-slate-600 sm:text-lg">{t("subtitle")}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
              <Link href="/register" className="btn-primary-brand sm:min-w-0">
                {t("ctaPrimary")}
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              </Link>
              <Link href="#courses" className="btn-outline-brand sm:w-auto">
                {t("ctaSecondary")}
              </Link>
            </div>

            <div
              className="mt-10 rounded-2xl border border-slate-200/90 bg-white px-4 py-1 shadow-card sm:px-5 sm:py-0 md:px-6"
              role="region"
              aria-label={t("trustedAria")}
            >
              <div className="flex flex-col divide-y divide-slate-200 sm:flex-row sm:divide-x sm:divide-y-0 sm:divide-slate-200">
                <div className="flex justify-center py-4 sm:shrink-0 sm:justify-start sm:py-4 sm:pe-4 md:pe-5">
                  <div className="flex -space-x-2.5">
                    {avatars.map((src, i) => (
                      <span
                        key={src}
                        className="relative inline-flex h-10 w-10 overflow-hidden rounded-full ring-2 ring-white"
                        style={{ zIndex: avatars.length - i }}
                      >
                        <Image src={src} alt="" width={40} height={40} className="object-cover" />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2.5 py-4 sm:flex-1 sm:justify-center sm:py-4 sm:px-3 md:px-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-brand-primary">
                    <Users className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-bold text-brand-ink">{t("statLearners")}</p>
                    <p className="text-xs text-slate-500">{t("statLearnersLabel")}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2.5 py-4 sm:flex-1 sm:justify-center sm:py-4 sm:px-3 md:px-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-brand-primary">
                    <GraduationCap className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-brand-ink">{t("statInstructors")}</p>
                    <p className="text-xs text-slate-500">{t("statInstructorsLabel")}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2.5 py-4 sm:flex-1 sm:justify-center sm:py-4 sm:ps-3 sm:pe-1 md:ps-4 md:pe-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <TrendingUp className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-brand-ink">{t("statRate")}</p>
                    <p className="text-xs text-slate-500">{t("statRateLabel")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
            <div className="relative overflow-hidden rounded-[1.25rem] bg-white shadow-lift ring-1 ring-slate-200/80 sm:rounded-3xl">
              <div className="relative aspect-[4/3] w-full lg:aspect-[5/4]">
                <Image
                  src={HERO_MOCKUP}
                  alt={t("mockupAlt")}
                  fill
                  className="object-contain object-center p-2 sm:p-3"
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
