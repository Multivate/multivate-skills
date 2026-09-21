import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import heroImage from "../../../public/footer-image.png";
import { Link } from "@/i18n/navigation";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section className="relative isolate min-h-[min(88vh,46rem)] overflow-hidden bg-brand-navy text-brand-paper">
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          className="animate-hero-zoom object-cover object-[center_28%] opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-brand-navy/86" aria-hidden />
      </div>

      <div className="container-page relative flex min-h-[min(88vh,46rem)] flex-col justify-end pb-16 pt-28 sm:pb-20 sm:pt-32 lg:justify-center lg:pb-24 lg:pt-28">
        <div className="max-w-2xl">
          <p className="tag-overline !text-neutral-300">{t("brand")}</p>
          <div className="marketing-rule mt-5 animate-rule-grow sm:mt-6" aria-hidden />

          <h1 className="animate-fade-up mt-7 max-w-[20ch] text-balance font-display text-[clamp(2.1rem,4.4vw,3.4rem)] font-semibold leading-[1.1] tracking-tighter text-brand-paper sm:mt-8">
            {t("title")}{" "}
            <span className="text-brand-accent">{t("titleHighlight")}</span>
          </h1>

          <p className="animate-fade-up-delay mt-5 max-w-prose text-base leading-relaxed text-neutral-300 sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="animate-fade-up-delay-2 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/register" className="btn-primary-brand sm:min-w-0">
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            </Link>
            <Link href="#courses" className="btn-outline-light sm:w-auto">
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
