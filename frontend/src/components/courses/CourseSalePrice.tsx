"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  formatCoursePrice,
  saleIsLive,
  salePriceCents,
} from "@/lib/course-price";

type Props = {
  priceCents: number;
  currency?: string;
  isFree?: boolean;
  discountPercent?: number | null;
  discountExpiresAt?: string | null;
  salePriceCentsOverride?: number | null;
  size?: "card" | "detail";
};

export function CourseSalePrice({
  priceCents,
  currency = "NGN",
  isFree = false,
  discountPercent,
  discountExpiresAt,
  salePriceCentsOverride,
  size = "card",
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const live = saleIsLive(discountPercent, discountExpiresAt, now);
  const computedSale = salePriceCents(priceCents, discountPercent, discountExpiresAt, now);
  const saleCents = live ? (salePriceCentsOverride ?? computedSale) : null;
  const listLabel = formatCoursePrice(priceCents, currency, isFree);
  const saleLabel =
    saleCents != null ? formatCoursePrice(saleCents, currency, false) : listLabel;

  if (!live || saleCents == null || saleCents >= priceCents) {
    return (
      <p className={size === "detail" ? "text-2xl font-semibold tracking-[-0.02em] text-brand-navy" : "text-base font-medium leading-none text-[#011B33] dark:text-[#eef4ff]"}>
        {listLabel}
      </p>
    );
  }

  return (
    <div className={size === "detail" ? "space-y-1.5" : "min-w-0"}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={`text-[#8b90a5] line-through decoration-[#8b90a5] ${size === "detail" ? "text-lg" : "text-sm"}`}
        >
          {listLabel}
        </span>
        <span
          className={
            size === "detail"
              ? "text-2xl font-semibold tracking-[-0.02em] text-brand-navy"
              : "text-base font-semibold leading-none text-[#011B33] dark:text-[#eef4ff]"
          }
        >
          {saleLabel}
        </span>
        {discountPercent ? (
          <span className="rounded bg-[#ffe8d6] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#c2410c]">
            -{discountPercent}%
          </span>
        ) : null}
      </div>
      {discountExpiresAt ? (
        <p className="mt-1 text-[11px] font-semibold tabular-nums text-[#c2410c]">
          Ends in {formatCountdown(discountExpiresAt, now)}
        </p>
      ) : null}
    </div>
  );
}
