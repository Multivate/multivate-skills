"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/layout/LogoMark";

export function AuthSplitLayout({
  brand,
  form,
  formMaxWidthClass = "max-w-md",
}: {
  brand: ReactNode;
  form: ReactNode;
  formMaxWidthClass?: string;
}) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <div className="grid min-h-screen min-h-[100dvh] grid-cols-1 bg-brand-paper lg:grid-cols-2">
      <aside className="relative flex flex-col overflow-hidden bg-brand-ink px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-6 lg:min-h-screen lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 20% 10%, rgba(232,121,10,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(232,121,10,0.12), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative z-[1] flex shrink-0 items-start justify-between gap-4">
          <Link href="/" className="inline-flex shrink-0" aria-label={tNav("homeAria")}>
            <LogoMark variant="inverse" className="max-w-[9rem] sm:max-w-[10rem]" priority />
          </Link>
          <Link
            href="/"
            className="shrink-0 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:text-white"
          >
            {t("backToSite")}
          </Link>
        </div>

        <div className="relative z-[1] mt-6 flex min-h-0 flex-1 flex-col sm:mt-8 lg:mt-10">{brand}</div>
      </aside>

      <main className="flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:border-l lg:border-brand-ink/10 lg:px-10 lg:py-14 xl:px-16">
        <div className={`mx-auto w-full ${formMaxWidthClass}`}>{form}</div>
      </main>
    </div>
  );
}

export function AuthBrandBlock({
  badge,
  title,
  description,
  imageSrc,
  imageAlt,
  heroFraming = "default",
}: {
  badge: string;
  title: ReactNode;
  description: string;
  imageSrc: string;
  imageAlt: string;
  heroFraming?: "default" | "register-group";
}) {
  const imageShellClass =
    heroFraming === "register-group"
      ? "relative mt-8 w-full overflow-hidden rounded-md border border-white/10 bg-white/[0.04] h-[clamp(220px,42vw,340px)] sm:h-[clamp(240px,44vw,380px)] lg:mt-10 lg:h-auto lg:min-h-[min(36vh,260px)] lg:flex-1"
      : "relative mt-8 w-full overflow-hidden rounded-md border border-white/10 bg-white/[0.04] h-[clamp(200px,38vw,300px)] sm:h-[clamp(220px,40vw,340px)] lg:mt-10 lg:h-auto lg:min-h-[min(30vh,220px)] lg:flex-1";

  const imageFillClass =
    heroFraming === "register-group"
      ? "object-cover object-[center_26%] sm:object-[center_24%]"
      : "object-cover object-[center_58%] sm:object-center";

  return (
    <div className="flex min-h-0 flex-1 flex-col text-white">
      <p className="tag-overline !text-brand-accent">{badge}</p>
      <div className="marketing-rule mt-4" aria-hidden />
      <h1 className="mt-6 max-w-xl shrink-0 font-display text-pretty text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[2.15rem]">
        {title}
      </h1>
      <p className="mt-4 max-w-md shrink-0 text-sm leading-relaxed text-white/65 sm:text-base">{description}</p>

      <div className={imageShellClass}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className={imageFillClass}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/50 to-transparent" aria-hidden />
      </div>
    </div>
  );
}
