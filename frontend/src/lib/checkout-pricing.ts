import { getCatalogCourseBySlug } from "@/data/courses-catalog";

export function checkoutDisplayPriceForSlug(slug: string): string {
  const c = getCatalogCourseBySlug(slug);
  if (c?.price) return c.price;
  return "Price is set at checkout";
}
