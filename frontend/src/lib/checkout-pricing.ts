import { getCatalogCourseBySlug } from "@/data/courses-catalog";

export const DEFAULT_CHECKOUT_AMOUNT_CENTS = 9900;

export function checkoutAmountCentsForSlug(_slug: string): number {
  return DEFAULT_CHECKOUT_AMOUNT_CENTS;
}

export function checkoutDisplayPriceForSlug(slug: string): string {
  const c = getCatalogCourseBySlug(slug);
  if (c?.price) return c.price;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(DEFAULT_CHECKOUT_AMOUNT_CENTS / 100);
}
