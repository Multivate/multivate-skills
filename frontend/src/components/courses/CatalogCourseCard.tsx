"use client";

import { Heart, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { useAuth } from "@/contexts/auth-context";
import { useWishlist } from "@/contexts/wishlist-context";
import type { BackendCourse } from "@/lib/backend-courses";
import type { CartLine } from "@/lib/cart-types";
import { formatCoursePrice } from "@/lib/course-price";

type Props = {
  course: BackendCourse;
  layout?: "grid" | "scroll";
  categoryLabel?: string;
};

export function CatalogCourseCard({ course, layout = "grid" }: Props) {
  const tTop = useTranslations("topCourses");
  const tCart = useTranslations("cart");
  const { user } = useAuth();
  const { hasSlug, toggle } = useWishlist();
  const wished = hasSlug(course.slug);

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
  const ratingCount = course.rating_count ?? 0;
  const rating = course.average_rating ?? 0;
  const shell = layout === "scroll" ? "w-[18.5rem] shrink-0 snap-start" : "h-full w-full min-w-0";

  return (
    <article className={`flex h-full flex-col rounded-2xl border border-[#e9eaf2] bg-white p-4 ${shell}`}>
      <Link href={`/courses/${course.slug}`} className="flex flex-col gap-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-100">
          <CourseThumbnail
            src={course.image_url}
            alt={course.title}
            sizes={layout === "scroll" ? "296px" : "(min-width: 1536px) 22vw, (min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"}
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 min-h-[2.6rem] text-[17px] font-medium leading-[1.2] text-[#011B33]">
            {course.title}
          </h3>
          {course.instructor_name ? (
            <p className="truncate text-xs font-normal text-[#71758e]">{course.instructor_name}</p>
          ) : null}
        </div>
        <ul className="flex min-h-[1.375rem] flex-wrap items-center gap-1 text-xs text-[#71758e]">
          {course.is_bestseller ? (
            <li>
              <span className="inline-flex rounded px-2 py-1 text-xs font-bold leading-none text-[#0d5261] bg-[#c2e9eb]">
                {tTop("bestseller")}
              </span>
            </li>
          ) : null}
          {ratingCount > 0 ? (
            <>
              <li>
                <span
                  className="inline-flex items-center gap-0.5"
                  aria-label={tTop("ratingAria", { score: rating.toFixed(1), count: ratingCount })}
                >
                  <span>{rating.toFixed(1)}</span>
                  <Star className="h-3.5 w-3.5 text-[#c4710d]" fill="currentColor" strokeWidth={0} aria-hidden />
                </span>
              </li>
              <li>{tTop("ratingsCount", { count: ratingCount })}</li>
            </>
          ) : (
            <li>
              <span className="inline-flex rounded bg-brand-sky px-2 py-1 text-xs font-bold leading-none text-brand-accent-dark">
                {tTop("newCourse")}
              </span>
            </li>
          )}
        </ul>
      </Link>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-base font-medium leading-none text-[#011B33]">{priceLabel}</p>
        <div className="flex items-center gap-2">
          {user?.role === "student" ? (
            <button
              type="button"
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              onClick={() => void toggle(course.slug)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d1d7dc] text-[#1c1d1f] hover:border-[#1457D0] hover:text-[#1457D0]"
            >
              <Heart className="h-4 w-4" fill={wished ? "currentColor" : "none"} />
            </button>
          ) : (
            <Link
              href={`/login?from=${encodeURIComponent(`/courses/${course.slug}`)}`}
              aria-label="Sign in to save this course"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d1d7dc] text-[#1c1d1f] hover:text-[#1457D0]"
            >
              <Heart className="h-4 w-4" />
            </Link>
          )}
          <AddToCartButton item={cartLine} variant="inline" addLabel={tCart("add")} removeLabel={tCart("remove")} />
        </div>
      </div>
    </article>
  );
}
