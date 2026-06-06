"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import type { BackendCourse } from "@/lib/backend-courses";
import type { CartLine } from "@/lib/cart-types";
import { formatCourseDuration, formatCoursePrice } from "@/lib/course-price";

const CARD_WIDTH_PX = 220;

function CourseCard({
  course,
  tTop,
  tCommon,
  tCart,
}: {
  course: BackendCourse;
  tTop: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
  tCart: ReturnType<typeof useTranslations>;
}) {
  const priceLabel = formatCoursePrice(
    course.price_cents ?? 0,
    course.currency ?? "NGN",
    course.is_free ?? false,
  );
  const cartLine: CartLine = {
    slug: course.slug,
    title: course.title,
    image: course.image_url,
    source: "live",
    priceLabel,
  };

  return (
    <article className="group relative z-10 flex w-[210px] min-w-[210px] max-w-[78vw] shrink-0 snap-center flex-col overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-brand-accent/35 hover:shadow-md sm:w-[220px] sm:min-w-[220px] sm:max-w-none">
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-slate-100">
        <CourseThumbnail
          src={course.image_url}
          alt={course.title}
          compact
          sizes="220px"
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-col p-3.5 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{course.title}</h3>
        {course.subtitle ? (
          <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-slate-500">{course.subtitle}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-slate-600">
          <span>{tTop("lessons", { count: course.lessons_count })}</span>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-3 w-3 text-brand-accent" strokeWidth={2} />
            {formatCourseDuration(course.duration_minutes ?? 0)}
          </span>
        </div>

        <p className="mt-2.5 text-base font-extrabold leading-none text-slate-900">{priceLabel}</p>

        <div className="mt-3 flex flex-col gap-1.5">
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex w-full min-h-[2.25rem] items-center justify-center rounded-lg bg-brand-primary px-3 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-dark sm:text-sm"
          >
            {tCommon("viewCourse")}
          </Link>
          <AddToCartButton
            item={cartLine}
            variant="outline"
            className="!min-h-[2.25rem] !w-full !rounded-lg !py-2 !text-xs !font-semibold !text-slate-800 sm:!text-sm"
            addLabel={tCart("add")}
          />
        </div>
      </div>
    </article>
  );
}

export function TopCoursesSection({ initialCourses = [] }: { initialCourses?: BackendCourse[] }) {
  const tTop = useTranslations("topCourses");
  const tExplore = useTranslations("landing.explore");
  const tCommon = useTranslations("common");
  const tCart = useTranslations("cart");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [courses, setCourses] = useState<BackendCourse[]>(initialCourses);
  const [loading, setLoading] = useState(initialCourses.length === 0);
  const [dot, setDot] = useState(0);

  useEffect(() => {
    if (initialCourses.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses");
        const data = (await res.json().catch(() => null)) as unknown;
        if (cancelled) return;
        setCourses(Array.isArray(data) ? (data as BackendCourse[]) : []);
      } catch {
        if (!cancelled) setCourses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCourses.length]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(CARD_WIDTH_PX, el.clientWidth * 0.6),
      behavior: "smooth",
    });
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setDot(index);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    const mid = el.scrollLeft + el.clientWidth / 2;
    children.forEach((child, i) => {
      const cMid = child.offsetLeft + child.offsetWidth / 2;
      const d = Math.abs(cMid - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setDot(best);
  }, []);

  const singleCourse = courses.length === 1;

  return (
    <section id="courses" className="section-y surface-section">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <h2 className="heading-section text-2xl sm:text-3xl lg:text-[2rem]">{tTop("heading")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{tTop("sub")}</p>
          </div>
          <Link
            href="/courses"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-primary transition hover:text-brand-primary-dark"
          >
            {tCommon("viewAllCourses")}
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-slate-500">{tExplore("viewDetails")}…</p>
        ) : courses.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-sm leading-relaxed text-slate-600">{tExplore("empty")}</p>
            <Link href="/courses" className="btn-outline-brand mt-5 inline-flex text-sm !py-2.5">
              {tExplore("viewAll")}
            </Link>
          </div>
        ) : (
          <>
            <div className={`relative mt-8 overflow-visible ${singleCourse ? "mx-auto max-w-[240px] sm:max-w-none" : ""}`}>
              {!singleCourse ? (
                <>
                  <button
                    type="button"
                    aria-label={tTop("scrollLeft")}
                    onClick={() => scrollBy(-1)}
                    className="absolute left-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-brand-accent/40 hover:bg-brand-accent/5 md:flex"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    aria-label={tTop("scrollRight")}
                    onClick={() => scrollBy(1)}
                    className="absolute right-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-brand-accent/40 hover:bg-brand-accent/5 md:flex"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </>
              ) : null}

              <div
                ref={scrollerRef}
                onScroll={onScroll}
                className={`flex gap-3 overflow-x-auto overflow-y-visible pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:gap-4 ${
                  singleCourse ? "justify-center md:justify-start" : "md:pl-11 md:pr-11"
                } [&::-webkit-scrollbar]:hidden`}
              >
                {courses.map((course) => (
                  <CourseCard
                    key={course.slug}
                    course={course}
                    tTop={tTop}
                    tCommon={tCommon}
                    tCart={tCart}
                  />
                ))}
              </div>
            </div>

            {!singleCourse ? (
              <div className="mt-5 flex justify-center gap-2 lg:hidden">
                {courses.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={tTop("goToCourse", { n: i + 1 })}
                    onClick={() => scrollToCard(i)}
                    className={`h-2 w-2 rounded-full transition ${
                      i === dot ? "w-6 bg-brand-primary" : "bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
