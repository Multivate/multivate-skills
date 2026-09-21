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
  coverPhoto,
}: {
  brand: ReactNode;
  form: ReactNode;
  formMaxWidthClass?: string;
  coverPhoto?: {
    src: string;
    alt: string;
    objectClassName?: string;
  };
}) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <div className="grid min-h-screen min-h-[100dvh] grid-cols-1 bg-brand-paper lg:grid-cols-2">
      <aside
        className={`relative flex flex-col overflow-hidden bg-brand-navy ${
          coverPhoto
            ? "px-0 pb-0 pt-5 sm:pt-6 lg:min-h-screen lg:pt-8"
            : "px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-6 lg:min-h-screen lg:px-10 lg:pb-12 lg:pt-8 xl:px-12"
        }`}
      >
        <div
          className={`relative z-[1] flex shrink-0 items-start justify-between gap-4 ${
            coverPhoto ? "px-5 sm:px-8 lg:px-10 xl:px-12" : ""
          }`}
        >
          <Link href="/" className="inline-flex shrink-0" aria-label={tNav("homeAria")}>
            <LogoMark variant="inverse" className="max-w-[9rem] sm:max-w-[10rem]" priority />
          </Link>
          <Link
            href="/"
            className="shrink-0 pt-1 font-mono text-xs font-semibold uppercase tracking-widest text-neutral-400 transition hover:text-brand-paper"
          >
            {t("backToSite")}
          </Link>
        </div>

        <div
          className={`relative z-[1] mt-6 flex min-h-0 flex-1 flex-col sm:mt-8 lg:mt-10 ${
            coverPhoto ? "px-5 sm:px-8 lg:px-10 xl:px-12" : ""
          }`}
        >
          {brand}
        </div>

        {coverPhoto ? (
          <div className="relative mt-8 aspect-[16/10] w-full shrink-0 overflow-hidden sm:mt-10 lg:mt-auto lg:max-h-[min(48vh,30rem)]">
            <Image
              src={coverPhoto.src}
              alt={coverPhoto.alt}
              fill
              priority
              className={coverPhoto.objectClassName ?? "object-cover object-center"}
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-navy/70 to-transparent"
              aria-hidden
            />
          </div>
        ) : null}
      </aside>

      <main className="min-h-screen overflow-y-auto bg-brand-paper lg:h-[100dvh] lg:border-l lg:border-brand-ink/10">
        <div className="mx-auto flex min-h-full w-full items-center justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-12 xl:px-16">
          <div className={`w-full ${formMaxWidthClass}`}>{form}</div>
        </div>
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
  imageSrc?: string;
  imageAlt?: string;
  heroFraming?: "default" | "register-group";
}) {
  const imageShellClass =
    heroFraming === "register-group"
      ? "relative mt-8 w-full overflow-hidden rounded-md border border-white/10 bg-brand-surface/[0.04] h-[clamp(220px,42vw,340px)] sm:h-[clamp(240px,44vw,380px)] lg:mt-10 lg:h-auto lg:min-h-[min(36vh,260px)] lg:flex-1"
      : "relative mt-8 w-full overflow-hidden rounded-md border border-white/10 bg-brand-surface/[0.04] h-[clamp(200px,38vw,300px)] sm:h-[clamp(220px,40vw,340px)] lg:mt-10 lg:h-auto lg:min-h-[min(30vh,220px)] lg:flex-1";

  const imageFillClass =
    heroFraming === "register-group"
      ? "object-cover object-center"
      : "object-cover object-[center_58%] sm:object-center";

  return (
    <div className="flex min-h-0 flex-1 flex-col text-white">
      <p className="tag-overline !text-brand-accent">{badge}</p>
      <div className="marketing-rule mt-4" aria-hidden />
      <h1 className="mt-6 max-w-xl shrink-0 text-balance font-display text-3xl font-semibold leading-[1.1] tracking-tighter text-brand-paper sm:text-4xl lg:text-[2.15rem]">
        {title}
      </h1>
      <p className="mt-4 max-w-prose shrink-0 text-sm leading-relaxed text-neutral-400 sm:text-base">{description}</p>

      {imageSrc ? (
        <div className={imageShellClass}>
          <Image
            src={imageSrc}
            alt={imageAlt ?? ""}
            fill
            className={imageFillClass}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-navy/35 via-transparent to-transparent" aria-hidden />
        </div>
      ) : null}
    </div>
  );
}
