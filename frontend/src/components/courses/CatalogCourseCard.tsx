"use client";

import { Clock, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import type { BackendCourse } from "@/lib/backend-courses";
import type { CartLine } from "@/lib/cart-types";
import { formatCourseDuration, formatCoursePrice } from "@/lib/course-price";

type Props = {
  course: BackendCourse;
  layout?: "grid" | "scroll";
  categoryLabel?: string;
};

export function CatalogCourseCard({ course, layout = "grid", categoryLabel }: Props) {
  const tTop = useTranslations("topCourses");
  const tCommon = useTranslations("common");
  const tCart = useTranslations("cart");

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

  const shellClass =
    layout === "scroll"
      ? "w-[min(100%,20rem)] min-w-[min(100%,18rem)] max-w-[20rem] shrink-0 snap-start sm:min-w-[18.5rem]"
      : "w-full min-w-0";

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-accent/30 hover:shadow-md ${shellClass}`}
    >
      <Link href={`/courses/${course.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
          <CourseThumbnail
            src={course.image_url}
            alt={course.title}
            sizes={layout === "scroll" ? "320px" : "(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 100vw"}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          {categoryLabel ? (
            <span className="absolute left-2 top-2 rounded-md bg-brand-ink/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {categoryLabel}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 min-h-[2.75rem] text-[0.9375rem] font-bold leading-snug text-slate-900 transition group-hover:text-brand-primary sm:text-base">
            {course.title}
          </h3>
          {course.subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{course.subtitle}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              New
            </span>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span>{tTop("lessons", { count: course.lessons_count })}</span>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-brand-accent" strokeWidth={2} aria-hidden />
              {formatCourseDuration(course.duration_minutes ?? 0)}
            </span>
          </div>

          <p className="mt-3 text-lg font-extrabold tracking-tight text-slate-900">{priceLabel}</p>
        </div>
      </Link>

      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <Link
          href={`/courses/${course.slug}`}
          className="inline-flex min-h-[2.5rem] flex-1 items-center justify-center rounded-lg bg-brand-primary px-3 text-center text-sm font-semibold text-white transition hover:bg-brand-primary-dark"
        >
          {tCommon("viewCourse")}
        </Link>
        <AddToCartButton
          item={cartLine}
          variant="outline"
          className="!min-h-[2.5rem] !flex-1 !rounded-lg !py-2 !text-sm !font-semibold !text-slate-800"
          addLabel={tCart("add")}
        />
      </div>
    </article>
  );
}
