"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { SiteHeaderSearch } from "@/components/layout/SiteHeaderSearch";
import { Link } from "@/i18n/navigation";

type Featured = {
  href: string;
  title: string;
  meta: string;
};

type Props = {
  brand: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  photoAlt: string;
  track: string[];
  featured: Featured | null;
};

function WeaveMark() {
  return (
    <svg viewBox="0 0 72 64" className="h-14 w-16" aria-hidden>
      <defs>
        <linearGradient id="weave" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16306B" />
          <stop offset="0.55" stopColor="#1457D0" />
          <stop offset="1" stopColor="#5EC8F8" />
        </linearGradient>
      </defs>
      <path
        d="M8 14c10 8 16 10 28 10s18-2 28-10v36c-10 8-16 10-28 10S18 58 8 50V14z"
        fill="#0C1B4A"
      />
      {[0, 1, 2, 3, 4].map((index) => (
        <path
          key={index}
          d={`M12 ${20 + index * 6}c8 5 14 7 24 7s16-2 24-7`}
          fill="none"
          stroke="url(#weave)"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="origin-center animate-shimmer"
          style={{ animationDelay: `${index * 0.15}s`, opacity: 0.55 + index * 0.08 }}
        />
      ))}
    </svg>
  );
}

export function HeroStage({
  brand,
  title,
  titleHighlight,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  photoAlt,
  track,
  featured,
}: Props) {
  const loop = [...track, ...track];

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#d7ebff] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 top-24 h-80 w-80 rounded-full bg-[#e7f4ff] blur-3xl" aria-hidden />

      <div className="container-page relative grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8 lg:py-16">
        <div className="max-w-xl">
          <div className="animate-bob inline-flex items-center gap-3">
            <WeaveMark />
            <span className="text-sm font-semibold text-brand-accent">{brand}</span>
          </div>
          <h1 className="animate-fade-up mt-4 text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.03em] text-brand-ink sm:text-5xl lg:text-[3.4rem]">
            {title} <span className="text-brand-accent">{titleHighlight}</span>
          </h1>
          <p className="animate-fade-up-delay mt-5 max-w-lg text-base leading-relaxed text-brand-ink/70 sm:text-lg">
            {subtitle}
          </p>
          <SiteHeaderSearch className="animate-fade-up-delay-2 mt-7 max-w-lg" inputId="hero-course-search" />
          <div className="animate-pop mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary-brand transition duration-200 hover:-translate-y-0.5">
              {ctaPrimary}
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
            <Link href="/courses" className="btn-outline-brand transition duration-200 hover:-translate-y-0.5">
              {ctaSecondary}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg pb-8 lg:max-w-none lg:pb-4">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-brand-navy shadow-[0_24px_60px_rgba(12,27,74,0.22)] sm:aspect-[5/4]">
            <Image
              src="/marketing/learners.jpg"
              alt={photoAlt}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 46vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/50 via-transparent to-transparent" />
          </div>

          <div className="animate-bob absolute left-3 top-6 flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-[0_12px_30px_rgba(12,27,74,0.16)] sm:left-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-accent opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-accent" />
            </span>
            <span className="text-sm font-semibold text-brand-navy">{track[0]}</span>
          </div>

          <div className="animate-bob-slow absolute -right-1 top-1/3 hidden w-28 overflow-hidden rounded-2xl border-4 border-white shadow-xl sm:block">
            <div className="relative aspect-square">
              <Image src="/marketing/germany.jpg" alt="" fill className="object-cover" sizes="112px" />
            </div>
          </div>

          {featured ? (
            <Link
              href={featured.href}
              className="animate-pop absolute bottom-0 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_16px_40px_rgba(12,27,74,0.18)] transition duration-200 hover:-translate-y-1 sm:left-6 sm:right-auto sm:max-w-xs"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <Image src="/marketing/study.jpg" alt="" fill className="object-cover" sizes="56px" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-brand-ink">{featured.title}</span>
                <span className="mt-0.5 block truncate text-xs text-brand-ink/60">{featured.meta}</span>
              </span>
            </Link>
          ) : (
            <div className="animate-pop absolute bottom-2 left-4 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_16px_40px_rgba(12,27,74,0.18)]">
              <span className="relative h-14 w-14 overflow-hidden rounded-xl">
                <Image src="/marketing/class.jpg" alt="" fill className="object-cover" sizes="56px" />
              </span>
              <span className="pr-2 text-sm font-semibold text-brand-navy">{titleHighlight}</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-y border-brand-ink/10 bg-brand-muted">
        <div className="overflow-hidden py-4">
          <div className="animate-marquee flex w-max items-center gap-3 pr-3">
            {loop.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" aria-hidden />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
