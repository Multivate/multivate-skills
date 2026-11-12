"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/contexts/cart-context";
import { bundleQuote } from "@/lib/course-bundle";
import { formatCoursePrice } from "@/lib/course-price";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

const menuPanel =
  "pointer-events-none absolute right-0 top-full z-50 w-80 max-w-[calc(100vw-2rem)] pt-2 opacity-0 translate-y-1 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100";

export function SiteHeaderCart() {
  const t = useTranslations("nav");
  const tCourses = useTranslations("dashboard.coursesTab");
  const { items, count } = useCart();
  const quote = bundleQuote(
    items.map((line) => line.slug),
    items.map((line) => line.priceCents ?? 0),
  );
  const [hover, setHover] = useState(false);
  useBodyScrollLock(hover, undefined, "events");

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHover(false);
      }}
    >
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[5px] text-[#011B33] transition duration-200 hover:bg-white/70 hover:text-brand-accent dark:text-[#eef4ff] dark:hover:bg-white/10"
        aria-label={t("cartAria", { count })}
      >
        <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2} />
        {count > 0 ? (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        ) : null}
      </button>
      <div className={menuPanel}>
        <div className="overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white py-1 shadow-[0_8px_24px_rgba(12,27,74,0.12)] dark:border-white/10 dark:bg-[#10192f]">
          {items.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[#011B33]/70 dark:text-[#eef4ff]/70">{t("cartEmpty")}</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/courses/${item.slug}`}
                    className="block px-3 py-2 text-sm font-medium text-[#011B33] transition duration-200 hover:bg-brand-sky dark:text-[#eef4ff] dark:hover:bg-white/10"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {quote.percent > 0 ? (
            <p className="border-t border-brand-ink/10 px-3 py-2 text-xs font-semibold text-[#1457D0]">
              {tCourses("bundleSave", { amount: formatCoursePrice(quote.saveCents, "NGN", false) })}
              {` · ${quote.percent}% (${quote.label})`}
            </p>
          ) : null}
          <Link
            href="/dashboard/courses?tab=saved"
            className="block border-t border-brand-ink/10 px-3 py-2 text-sm font-medium text-brand-accent transition duration-200 hover:bg-brand-sky"
          >
            {t("cartDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
