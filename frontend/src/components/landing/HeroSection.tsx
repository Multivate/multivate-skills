import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import heroImage from "../../../public/footer-image.png";
import { Link } from "@/i18n/navigation";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section className="relative isolate min-h-[min(92vh,52rem)] overflow-hidden bg-brand-navy text-white">
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          className="animate-hero-zoom object-cover object-[center_28%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(105deg,rgba(10,15,26,0.92)_0%,rgba(10,15,26,0.78)_42%,rgba(10,15,26,0.45)_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.14] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
          aria-hidden
        />
      </div>

      <div className="container-page relative flex min-h-[min(92vh,52rem)] flex-col justify-end pb-16 pt-28 sm:pb-20 sm:pt-32 lg:justify-center lg:pb-24 lg:pt-28">
        <div className="max-w-3xl">
          <p className="animate-fade-up font-display text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-none tracking-[-0.04em] text-white">
            {t("brand")}
          </p>
          <div className="marketing-rule mt-5 animate-rule-grow sm:mt-6" aria-hidden />

          <h1 className="animate-fade-up-delay mt-7 max-w-[18ch] font-display text-[clamp(1.65rem,3.6vw,2.65rem)] font-semibold leading-[1.15] tracking-tight text-white/95 sm:mt-8">
            {t("title")}{" "}
            <span className="text-brand-accent">{t("titleHighlight")}</span>
          </h1>

          <p className="animate-fade-up-delay-2 mt-5 max-w-copy text-base leading-relaxed text-white/75 sm:text-lg">
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
