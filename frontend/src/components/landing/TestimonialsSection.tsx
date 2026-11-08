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
          className={`h-3.5 w-3.5 ${i < rating ? "fill-brand-accent text-brand-accent" : "text-brand-ink/15"}`}
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
    <section id="success-stories" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">{t("heading")}</h2>
        </div>

        <div className="relative mt-10">
          <button
            type="button"
            aria-label={t("scrollRight")}
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-brand-ink/15 bg-brand-paper text-brand-ink transition hover:border-brand-accent hover:text-brand-accent md:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] md:pr-14 [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((review) => (
              <article
                key={review.id}
                className="flex w-[min(100%,22rem)] shrink-0 snap-start flex-col rounded-xl border border-brand-ink/10 bg-white px-6 py-7 shadow-[0_8px_24px_rgba(12,27,74,0.04)] sm:w-[20rem]"
              >
                <StarRow rating={review.rating} />
                <blockquote className="mt-5 flex-1 text-lg font-medium leading-snug text-brand-ink">
                  “{review.comment}”
                </blockquote>

                <div className="mt-8 flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                    {initials(review.reviewer_display_name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-ink">{review.reviewer_display_name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-brand-ink/55">{review.course_title}</p>
                  </div>
                </div>

                <Link
                  href={`/courses/${review.course_slug}`}
                  className="mt-6 inline-flex items-center gap-0.5 text-sm font-semibold text-brand-accent transition hover:text-brand-accent-dark"
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
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-accent transition hover:text-brand-accent-dark"
          >
            {t("viewAllStories")}
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
