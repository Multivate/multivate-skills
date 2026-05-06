"use client";

import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useRef } from "react";

type QuotePart = { text: string; bold?: boolean };

type SuccessStory = {
  id: string;
  quote: QuotePart[];
  name: string;
  line: string;
  /** Square crop, shown as circular headshot. */
  avatar: string;
  avatarAlt: string;
  ctaLabel: string;
  ctaHref: string;
};

const stories: SuccessStory[] = [
  {
    id: "emily",
    quote: [
      {
        text: "The German pathway and interview prep were exactly what I needed. I went from ad-hoc apps to a ",
      },
      { text: "clear offer in Germany within a few months", bold: true },
      {
        text: "— with feedback that felt honest, not generic.",
      },
    ],
    name: "Emily Hartmann",
    line: "Operations lead, now based in Munich",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
    avatarAlt: "Professional headshot used for Emily Hartmann's learner story",
    ctaLabel: "View German courses",
    ctaHref: "/courses/german",
  },
  {
    id: "michael",
    quote: [
      {
        text: "Multivate’s full-stack track forced me to ship end-to-end. Recruiters finally had something tangible to discuss—my ",
      },
      { text: "portfolio matched the job description", bold: true },
      { text: ", not just bullet points on a résumé." },
    ],
    name: "Michael Brennan",
    line: "Technical co-founder, early-stage SaaS",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    avatarAlt: "Professional headshot used for Michael Brennan's learner story",
    ctaLabel: "View web development courses",
    ctaHref: "/courses/fullstack-react",
  },
  {
    id: "charlotte",
    quote: [
      {
        text: "I needed cloud vocabulary that held up in real interviews. The labs and architecture walkthroughs gave me ",
      },
      { text: "confidence explaining trade-offs under pressure", bold: true },
      { text: "— not just buzzwords on slides." },
    ],
    name: "Charlotte Webb",
    line: "Platform engineer candidate, Frankfurt area",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&h=256&q=80",
    avatarAlt: "Professional headshot used for Charlotte Webb's learner story",
    ctaLabel: "View cloud & DevOps courses",
    ctaHref: "/courses/kubernetes",
  },
  {
    id: "thomas",
    quote: [
      {
        text: "The AI ethics and tooling modules were refreshingly grounded. I could articulate ",
      },
      { text: "how we would deploy and monitor models responsibly", bold: true },
      { text: " in front of our compliance partners the following week." },
    ],
    name: "Thomas Keller",
    line: "Product manager, regulated industry",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
    avatarAlt: "Professional headshot used for Thomas Keller’s learner story",
    ctaLabel: "View AI & machine learning courses",
    ctaHref: "/courses/ai",
  },
  {
    id: "hannah",
    quote: [
      {
        text: "Between workplace German and the career skills workshops, I rebuilt how I presented my experience. The outcome was simple: ",
      },
      { text: "I signed an offer I would not have pursued alone", bold: true },
      { text: "." },
    ],
    name: "Hannah Morris",
    line: "Marketing lead transitioning to Germany",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
    avatarAlt: "Professional headshot used for Hannah Morris's learner story",
    ctaLabel: "View career skills courses",
    ctaHref: "/courses/product-management",
  },
];

function QuoteBody({ parts }: { parts: QuotePart[] }) {
  return (
    <blockquote className="text-[0.9375rem] leading-relaxed text-slate-700 sm:text-base">
      {parts.map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-semibold text-slate-900">
            {part.text}
          </strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </blockquote>
  );
}

export function TestimonialsSection() {
  const t = useTranslations("testimonials");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(300, el.clientWidth * 0.55),
      behavior: "smooth",
    });
  }, []);

  return (
    <section id="success-stories" className="section-y bg-white">
      <div className="container-page">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <h2 className="heading-section text-pretty text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] lg:text-[1.85rem]">
              {t("heading")}
            </h2>
          </div>
        </div>

        <div className="relative mt-10 lg:mt-12">
          <button
            type="button"
            aria-label={t("scrollRight")}
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-slate-300 hover:bg-slate-50 md:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto pb-2 pl-0 pr-0 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 md:pr-14 [&::-webkit-scrollbar]:hidden"
          >
            {stories.map((s) => (
              <article
                key={s.id}
                className="flex w-[min(100%,320px)] shrink-0 snap-start flex-col rounded-2xl border border-slate-200/95 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:w-[300px] lg:w-[min(100%,340px)] lg:p-7"
              >
                <span
                  className="font-serif text-[2.75rem] font-bold leading-none text-slate-300"
                  aria-hidden
                >
                  “
                </span>

                <div className="mt-1 min-h-[7.5rem] flex-1">
                  <QuoteBody parts={s.quote} />
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-slate-100">
                    <Image
                      src={s.avatar}
                      alt={s.avatarAlt}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">
                      {s.line}
                    </p>
                  </div>
                </div>

                <Link
                  href={s.ctaHref}
                  className="mt-5 inline-flex items-center gap-0.5 text-sm font-semibold text-brand-primary transition hover:text-brand-primary-dark"
                >
                  {s.ctaLabel}
                  <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary transition hover:text-brand-primary-dark"
          >
            {t("viewAllStories")}
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
