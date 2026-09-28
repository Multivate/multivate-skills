import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import heroImage from "../../../public/footer-image.png";
import { Link } from "@/i18n/navigation";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section className="relative isolate min-h-[100svh] bg-brand-navy text-brand-paper sm:min-h-[min(88svh,46rem)]">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          className="animate-hero-zoom object-cover object-[center_28%] opacity-55"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-brand-navy/70" aria-hidden />
      </div>

      <div className="container-page relative flex min-h-[100svh] flex-col justify-start pb-12 pt-[5.75rem] sm:min-h-[min(88svh,46rem)] sm:pb-16 sm:pt-28 lg:pb-24 lg:pt-32">
        <div className="w-full max-w-2xl">
          <p className="font-mono text-sm font-semibold uppercase tracking-[0.22em] text-brand-paper sm:text-base">
            {t("brand")}
          </p>

          <h1 className="mt-5 text-left font-display text-[clamp(2.05rem,8.2vw,3.4rem)] font-semibold leading-[1.15] text-brand-paper sm:mt-7 sm:max-w-xl sm:tracking-tight">
            {t("title")}{" "}
            <span className="text-brand-accent">{t("titleHighlight")}</span>
          </h1>

          <p className="mt-5 max-w-prose text-base leading-relaxed text-neutral-300 sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
