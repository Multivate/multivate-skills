"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogCourseCard } from "@/components/courses/CatalogCourseCard";
import type { BackendCourse } from "@/lib/backend-courses";

export function TopCoursesSection({ initialCourses = [] }: { initialCourses?: BackendCourse[] }) {
  const tTop = useTranslations("topCourses");
  const tExplore = useTranslations("landing.explore");
  const tCommon = useTranslations("common");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [courses, setCourses] = useState<BackendCourse[]>(initialCourses);
  const [loading, setLoading] = useState(initialCourses.length === 0);

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
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.72), behavior: "smooth" });
  }, []);

  const useGrid = courses.length <= 4;

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
        ) : useGrid ? (
          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {courses.map((course) => (
              <li key={course.slug} className={courses.length === 1 ? "mx-auto w-full max-w-sm sm:max-w-md" : undefined}>
                <CatalogCourseCard course={course} layout="grid" categoryLabel={course.category} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="relative mt-10">
            <button
              type="button"
              aria-label={tTop("scrollLeft")}
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-brand-accent/40 hover:bg-brand-accent/5 md:flex"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={tTop("scrollRight")}
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-brand-accent/40 hover:bg-brand-accent/5 md:flex"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>

            <div
              ref={scrollerRef}
              className="flex gap-5 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory md:pl-12 md:pr-12 [&::-webkit-scrollbar]:hidden"
            >
              {courses.map((course) => (
                <CatalogCourseCard key={course.slug} course={course} layout="scroll" categoryLabel={course.category} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
