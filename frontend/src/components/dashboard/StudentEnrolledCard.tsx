"use client";

import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { Link } from "@/i18n/navigation";

export type EnrolledCourse = {
  slug: string;
  title: string;
  image_url: string;
  image_alt?: string;
  instructor_name?: string | null;
  progress_pct: number;
  lesson_done: number;
  lessons: number;
  status?: string;
  current_week_title?: string;
  current_week_lessons?: number;
  current_week_done?: number;
};

export function StudentEnrolledCard({
  course,
  layout = "grid",
}: {
  course: EnrolledCourse;
  layout?: "grid" | "row";
}) {
  const started = course.progress_pct > 0 || course.lesson_done > 0;
  const weekHint =
    course.current_week_title && (course.current_week_lessons ?? 0) > 0
      ? `${course.current_week_title} · ${course.current_week_done ?? 0}/${course.current_week_lessons}`
      : null;

  if (layout === "row") {
    return (
      <Link
        href={`/learn/${course.slug}`}
        className="group grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 rounded-[5px] py-2 hover:bg-[#f6f8fb]"
      >
        <div className="relative aspect-video overflow-hidden rounded-[4px] bg-[#f7f9fa]">
          <CourseThumbnail src={course.image_url} alt={course.image_alt || course.title} sizes="96px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-[#011B33] group-hover:text-brand-accent">{course.title}</h3>
          <p className="mt-0.5 truncate text-xs text-[#011B33]/50">{weekHint || course.instructor_name}</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-ink/10">
            <div className="h-full bg-brand-accent" style={{ width: `${Math.min(100, Math.max(0, course.progress_pct))}%` }} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="flex w-full min-w-0 flex-col">
      <Link href={`/learn/${course.slug}`} className="group flex flex-col">
        <div className="relative aspect-video w-full overflow-hidden rounded-[5px] bg-[#f7f9fa]">
          <CourseThumbnail src={course.image_url} alt={course.image_alt || course.title} sizes="248px" className="object-cover" />
        </div>
        <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-[#011B33] group-hover:text-brand-accent">
          {course.title}
        </h3>
        {weekHint ? <p className="mt-1 truncate text-xs text-[#011B33]/55">{weekHint}</p> : null}
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-brand-ink/10">
          <div className="h-full bg-brand-accent" style={{ width: `${Math.min(100, Math.max(0, course.progress_pct))}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-brand-accent">
          {started ? `${course.progress_pct}% complete` : "Start course"}
        </p>
      </Link>
    </article>
  );
}
