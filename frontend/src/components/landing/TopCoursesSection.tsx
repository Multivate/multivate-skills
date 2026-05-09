"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CatalogCourse,
  categoryTabs,
  courses,
  matchesTab,
  type TabId,
} from "@/data/courses-catalog";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { CartLine } from "@/lib/cart-types";

function CourseCard({
  c,
  id,
  index,
  tTop,
  tCommon,
}: {
  c: CatalogCourse;
  id?: string;
  index: number;
  tTop: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const flyoutLeft = index % 4 >= 2;
  const cartLine: CartLine = {
    slug: c.slug,
    title: c.title,
    image: c.image,
    source: "catalog",
    priceLabel: c.price,
  };

  return (
    <article
      id={id}
      className="group relative z-10 flex min-h-[26rem] min-w-[min(100%,280px)] shrink-0 snap-center flex-col rounded-2xl border border-slate-200/95 bg-white shadow-card hover:z-40 sm:min-h-[27rem] sm:min-w-[260px] lg:min-h-[27rem] lg:min-w-[280px]"
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-t-2xl bg-slate-100">
        <Image
          src={c.image}
          alt={c.imageAlt}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
          sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 24vw, 280px"
        />
      </div>

      <div className="flex flex-1 flex-col rounded-b-2xl border-t border-slate-100 p-5 sm:p-6 lg:p-6">
        <h3 className="text-[0.95rem] font-bold leading-snug text-slate-900 sm:text-base lg:min-h-[2.75rem] lg:text-[1.05rem]">
          {c.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{c.instructor}</p>
        <span
          className={`mt-2 inline-flex w-fit rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.pillClass}`}
        >
          {c.pill}
        </span>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-700">
          <span className="font-bold text-slate-900">{c.rating}</span>
          <Star
            className="h-3.5 w-3.5 fill-amber-400 text-amber-500"
            strokeWidth={1.5}
          />
          <span className="text-slate-500">
            ({c.reviews} {tTop("reviews")})
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-600">
          <span className="font-semibold text-slate-800">{c.level}</span>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span>{tTop("lessons", { count: c.lessons })}</span>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" strokeWidth={2} />
            {c.hours}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {c.description}
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-slate-900">{c.price}</span>
          <span className="text-sm text-slate-400 line-through">{c.wasPrice}</span>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <Link href={`/courses/${c.slug}`} className="btn-primary-brand w-full !py-3 text-[0.8125rem]">
            {tCommon("viewCourse")}
          </Link>
          <AddToCartButton item={cartLine} variant="outline" className="!w-full" />
        </div>
      </div>

      {/* Udemy-style hover panel — desktop only */}
      <div
        className={`pointer-events-none absolute top-0 z-50 hidden w-[min(100vw-2rem,18rem)] shadow-[0_16px_40px_-8px_rgba(15,23,42,0.18)] transition-opacity duration-150 ease-out will-change-transform lg:block lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 ${
          flyoutLeft
            ? "right-full mr-3 rounded-2xl border border-slate-200 bg-white p-4"
            : "left-full ml-3 rounded-2xl border border-slate-200 bg-white p-4"
        } `}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-primary">
          Multivate
        </p>
        <p className="mt-1 text-sm font-bold leading-snug text-slate-900">{c.title}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{c.detail}</p>
        <ul className="mt-3 space-y-2">
          {c.bullets.map((line) => (
            <li key={line} className="flex gap-2 text-xs leading-snug text-slate-700">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-primary"
                strokeWidth={2.5}
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <AddToCartButton item={cartLine} variant="primary" className="!w-full !py-2.5 text-xs" />
        </div>
      </div>
    </article>
  );
}

export function TopCoursesSection() {
  const tTop = useTranslations("topCourses");
  const tTabs = useTranslations("topCourses.tabs");
  const tCommon = useTranslations("common");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [dot, setDot] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const visibleCourses = useMemo(
    () => courses.filter((c) => matchesTab(activeTab, c.category)),
    [activeTab],
  );

  useEffect(() => {
    setDot(0);
  }, [activeTab]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(260, el.clientWidth * 0.75),
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

        <div className="mt-8 border-b border-slate-200">
          <nav
            className="-mb-px flex gap-6 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden"
            aria-label={tTop("categoriesAria")}
          >
            {categoryTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm font-semibold transition ${
                    active
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tTabs(tab.id)}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="relative mt-10 overflow-visible">
          <button
            type="button"
            aria-label={tTop("scrollLeft")}
            onClick={() => scrollBy(-1)}
            className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-slate-300 hover:bg-slate-50 md:flex"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={tTop("scrollRight")}
            onClick={() => scrollBy(1)}
            className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-slate-300 hover:bg-slate-50 md:flex"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>

          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="flex gap-4 overflow-x-auto overflow-y-visible pb-2 pl-0 pr-0 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory md:gap-5 md:pl-12 md:pr-12 lg:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {visibleCourses.map((c, index) => (
              <CourseCard
                key={c.slug}
                c={c}
                index={index}
                id={c.slug === "german" ? "german" : undefined}
                tTop={tTop}
                tCommon={tCommon}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2 lg:hidden">
          {visibleCourses.map((_, i) => (
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
      </div>
    </section>
  );
}
