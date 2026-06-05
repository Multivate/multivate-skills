"use client";

import { ChevronRight, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicReview } from "@/lib/backend-reviews";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-500" : "text-slate-200"}`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection({ initialReviews = [] }: { initialReviews?: PublicReview[] }) {
  const t = useTranslations("testimonials");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<PublicReview[]>(initialReviews);
  const [loading, setLoading] = useState(initialReviews.length === 0);

  useEffect(() => {
    if (initialReviews.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reviews/public");
        const data = (await res.json().catch(() => null)) as unknown;
        if (cancelled) return;
        setReviews(Array.isArray(data) ? (data as PublicReview[]) : []);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialReviews.length]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(300, el.clientWidth * 0.55),
      behavior: "smooth",
    });
  }, []);

  if (loading || reviews.length === 0) {
    return null;
  }

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
            className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-brand-secondary/40 hover:bg-brand-secondary/5 active:scale-95 md:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 md:pr-14 [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((review) => (
              <article
                key={review.id}
                className="flex w-[min(100%,320px)] shrink-0 snap-start flex-col rounded-2xl border border-slate-200/95 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-brand-secondary/30 hover:shadow-md sm:w-[300px] lg:w-[min(100%,340px)] lg:p-7"
              >
                <span className="font-serif text-[2.75rem] font-bold leading-none text-brand-secondary/40" aria-hidden>
                  “
                </span>

                <div className="mt-1 min-h-[5rem] flex-1">
                  <StarRow rating={review.rating} />
                  <blockquote className="mt-3 text-sm leading-relaxed text-slate-700">{review.comment}</blockquote>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-secondary/15 text-sm font-bold text-brand-secondary ring-2 ring-brand-secondary/20">
                    {initials(review.reviewer_display_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{review.reviewer_display_name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500">{review.course_title}</p>
                  </div>
                </div>

                <Link
                  href={`/courses/${review.course_slug}`}
                  className="mt-5 inline-flex items-center gap-0.5 text-sm font-semibold text-brand-primary transition hover:text-brand-primary-dark"
                >
                  {t("viewCourse")}
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
