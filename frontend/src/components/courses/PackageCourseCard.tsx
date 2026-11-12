"use client";

import { useTranslations } from "next-intl";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { useCart } from "@/contexts/cart-context";
import type { BackendCourse } from "@/lib/backend-courses";
import type { CartLine } from "@/lib/cart-types";
import { GERMAN_PACKAGES, LADDER_PRICE_NAIRA, packageQuote, type GermanPackage } from "@/lib/course-bundle";
import { formatCoursePrice } from "@/lib/course-price";
import { useVisitorGeo } from "@/contexts/visitor-geo-context";
import { toDisplayMoney } from "@/lib/visitor-geo";

type Props = {
  pkg: GermanPackage;
  catalog: BackendCourse[];
  layout?: "grid" | "scroll";
};

export function PackageCourseCard({ pkg, catalog, layout = "grid" }: Props) {
  const tTop = useTranslations("topCourses");
  const tCart = useTranslations("cart");
  const geo = useVisitorGeo();
  const { addItems, removeItems, items } = useCart();
  const quote = packageQuote(pkg, catalog);
  const list = toDisplayMoney(quote.listCents, "NGN", geo);
  const sale = toDisplayMoney(quote.payableCents, "NGN", geo);
  const save = toDisplayMoney(quote.saveCents, "NGN", geo);
  const inCart = pkg.slugs.every((slug) => items.some((row) => row.slug === slug));
  const shell = layout === "scroll" ? "w-[18.5rem] shrink-0 snap-start" : "h-full w-full min-w-0";

  function togglePackage() {
    const lines: CartLine[] = pkg.slugs.map((slug) => {
      const course = catalog.find((row) => row.slug === slug);
      const cents = course?.price_cents ?? (LADDER_PRICE_NAIRA[slug] ?? 0) * 100;
      return {
        slug,
        title: course?.title ?? slug,
        image: course?.image_url || pkg.image,
        source: "live",
        priceLabel: formatCoursePrice(cents, "NGN", false),
        priceCents: cents,
      };
    });
    if (inCart) removeItems(pkg.slugs);
    else addItems(lines);
  }

  return (
    <article
      id={pkg.id}
      className={`flex h-full flex-col scroll-mt-24 rounded-2xl border border-[#e9eaf2] bg-white p-4 dark:border-white/10 dark:bg-[#10192f] ${shell}`}
    >
      <div className="flex flex-col gap-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-100">
          <CourseThumbnail src={pkg.image} alt={pkg.title} sizes={layout === "scroll" ? "296px" : "45vw"} className="object-cover" />
          <span className="absolute left-2 top-2 rounded bg-[#d4a84b] px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#10244F]">
            {tTop("packageCourse")}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#1457D0]">{tTop("packageCourse")}</p>
          <h3 className="line-clamp-3 min-h-[3.2rem] text-[17px] font-medium leading-[1.2] text-[#011B33] dark:text-[#eef4ff]">
            {pkg.title}
          </h3>
          <p className="mt-1 text-xs font-medium text-[#011B33]/70 dark:text-[#eef4ff]/70">
            {tTop("packageCount", { count: pkg.slugs.length, percent: pkg.percent })}
          </p>
        </div>
        <span className="inline-flex w-fit rounded bg-[#ffe8d6] px-2 py-1 text-xs font-bold leading-none text-[#c2410c]">
          -{pkg.percent}%
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-[#8b90a5] line-through decoration-[#8b90a5]">
              {formatCoursePrice(list.cents, list.currency, false)}
            </span>
            <span className="text-base font-semibold leading-none text-[#011B33] dark:text-[#eef4ff]">
              {formatCoursePrice(sale.cents, sale.currency, false)}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-[#c2410c]">
            {tTop("packageSave", { amount: formatCoursePrice(save.cents, save.currency, false) })}
          </p>
        </div>
        <button
          type="button"
          onClick={togglePackage}
          className={`inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-bold transition ${
            inCart
              ? "border-brand-accent bg-brand-accent text-white hover:bg-brand-accent-dark"
              : "border-brand-accent bg-transparent text-brand-accent hover:bg-brand-accent hover:text-white"
          }`}
        >
          {inCart ? tCart("remove") : tCart("add")}
        </button>
      </div>
    </article>
  );
}

export function germanPackagesForTab(tab: string) {
  if (tab !== "all" && tab !== "german") return [];
  return GERMAN_PACKAGES;
}
