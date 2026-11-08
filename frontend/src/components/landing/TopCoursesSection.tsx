"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const course of courses) {
      const label = course.category?.trim();
      if (label) seen.add(label);
    }
    return Array.from(seen);
  }, [courses]);
  const [activeCategory, setActiveCategory] = useState("all");
  const visible = (
    activeCategory === "all" ? courses : courses.filter((course) => course.category === activeCategory)
  ).slice(0, 8);

  return (
    <section id="courses" className="bg-white py-14 sm:py-16">
      <div className="container-page">
        <div className="max-w-3xl">
          <h2 className="text-[1.75rem] font-extrabold leading-tight text-[#011B33] sm:text-[2.125rem]">
            {tTop("heading")}
          </h2>
          <p className="mt-2 text-lg text-[#011B33]/60">{tTop("sub")}</p>
        </div>

        {categories.length > 0 ? (
          <div
            className="mt-6 flex gap-1 overflow-x-auto border-b border-neutral-200"
            role="tablist"
            aria-label={tTop("categoriesAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 border-b-2 px-4 py-3 text-base font-bold ${
                activeCategory === "all"
                  ? "border-brand-navy text-brand-navy"
                  : "border-transparent text-[#011B33]/60 hover:text-brand-navy"
              }`}
            >
              {tTop("tabs.all")}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 border-b-2 px-4 py-3 text-base font-bold ${
                  activeCategory === category
                    ? "border-brand-navy text-brand-navy"
                    : "border-transparent text-[#011B33]/60 hover:text-brand-navy"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-10 text-sm text-neutral-500">{tExplore("viewDetails")}…</p>
        ) : courses.length === 0 ? (
          <p className="mt-8 max-w-prose text-sm leading-relaxed text-neutral-500">{tExplore("empty")}</p>
        ) : (
          <div className="relative mt-6">
            <button
              type="button"
              aria-label={tTop("scrollLeft")}
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-[4.15rem] z-20 hidden h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-zinc-700 shadow-sm transition hover:border-brand-accent/40 hover:bg-brand-accent/5 sm:flex"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={tTop("scrollRight")}
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-[4.15rem] z-20 flex h-11 w-11 translate-x-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-zinc-700 shadow-sm transition hover:border-brand-accent/40 hover:bg-brand-accent/5"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>

            <div
              ref={scrollerRef}
              className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
            >
              {visible.map((course) => (
                <CatalogCourseCard key={course.slug} course={course} layout="scroll" categoryLabel={course.category} />
              ))}
            </div>
          </div>
        )}

        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-brand-accent hover:text-brand-accent-dark"
        >
          {tCommon("viewAllCourses")}
          <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
