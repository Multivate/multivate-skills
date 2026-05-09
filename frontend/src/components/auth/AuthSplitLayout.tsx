"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/layout/LogoMark";

export function AuthSplitLayout({
  brand,
  form,
  /** Wider column for long flows (e.g. register wizard). Default matches compact login. */
  formMaxWidthClass = "max-w-md",
}: {
  brand: ReactNode;
  form: ReactNode;
  formMaxWidthClass?: string;
}) {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <div className="grid min-h-screen min-h-[100dvh] grid-cols-1 bg-white dark:bg-slate-950 lg:grid-cols-2">
      <aside className="relative flex flex-col bg-brand-auth-page px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-6 lg:min-h-screen lg:px-10 lg:pb-12 lg:pt-8 xl:px-12">
        <div className="relative z-[1] flex shrink-0 items-start justify-between gap-4">
          <Link href="/" className="inline-flex shrink-0" aria-label={tNav("homeAria")}>
            <LogoMark variant="inverse" className="max-w-[9rem] sm:max-w-[10rem]" priority />
          </Link>
          <Link
            href="/"
            className="shrink-0 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:text-white"
          >
            {t("backToSite")}
          </Link>
        </div>

        <div className="relative z-[1] mt-6 flex min-h-0 flex-1 flex-col sm:mt-7 lg:mt-6">{brand}</div>
      </aside>

      <main className="flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 lg:border-l lg:border-slate-200/80 dark:lg:border-slate-800/80 lg:px-10 lg:py-12 xl:px-14">
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
  /** Taller frame + focal point tuned for group photos on register */
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
      ? "relative mt-6 w-full overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.22)] h-[clamp(220px,42vw,340px)] sm:mt-7 sm:h-[clamp(240px,44vw,380px)] lg:mt-8 lg:h-auto lg:min-h-[min(36vh,260px)] lg:flex-1"
      : "relative mt-6 w-full overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.22)] h-[clamp(200px,38vw,300px)] sm:mt-7 sm:h-[clamp(220px,40vw,340px)] lg:mt-8 lg:h-auto lg:min-h-[min(30vh,220px)] lg:flex-1";

  const imageFillClass =
    heroFraming === "register-group"
      ? "object-cover object-[center_26%] sm:object-[center_24%]"
      : "object-cover object-[center_58%] sm:object-center";

  return (
    <div className="flex min-h-0 flex-1 flex-col text-white">
      <span className="inline-flex w-fit shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
        {badge}
      </span>
      <h1 className="mt-5 max-w-xl shrink-0 text-pretty text-2xl font-extrabold leading-[1.12] tracking-tight text-white sm:mt-6 sm:text-3xl lg:text-[1.7rem] xl:text-[1.95rem]">
        {title}
      </h1>
      <p className="mt-3 max-w-md shrink-0 text-sm leading-relaxed text-white/80 sm:text-[0.9375rem]">{description}</p>

      <div className={imageShellClass}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className={imageFillClass}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-brand-auth-page/45"
          aria-hidden
        />
      </div>
    </div>
  );
}
