"use client";

import { BookOpen, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";

export type InstructorCourseCardData = {
  slug: string;
  title: string;
  image_url: string;
  lessons_count: number;
  enrollment_count: number;
};

function Stat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: number; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-brand-sky text-brand-accent dark:bg-[#1457D0]/25 dark:text-[#8ec0ff]">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold tabular-nums leading-none">{value}</span>
        <span className="mt-0.5 block truncate text-[11px] text-[#011B33]/45 dark:text-[#eef4ff]/50">{label}</span>
      </span>
    </div>
  );
}

export function InstructorCourseCard({
  course,
  rankPct,
  badge,
  footer,
}: {
  course: InstructorCourseCardData;
  rankPct: number;
  badge?: string;
  footer?: ReactNode;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white p-3 transition duration-300 ease-out hover:-translate-y-1 hover:border-brand-accent/35 hover:shadow-[0_20px_44px_rgba(16,36,79,0.12)] dark:border-white/10 dark:bg-[#10192f]">
      <Link href={`/instructor/studio/${course.slug}`} className="relative block overflow-hidden rounded-[5px] bg-[#f4f6fb]">
        <div className="relative aspect-[16/10]">
          <CourseThumbnail
            src={course.image_url}
            alt={course.title}
            sizes="(min-width: 1280px) 28vw, (min-width: 640px) 46vw, 100vw"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.05]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10244F]/75 via-[#10244F]/10 to-transparent opacity-80 transition duration-300 group-hover:opacity-90" />
          {badge ? (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-brand-accent shadow-sm">
              {badge}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <h3 className="line-clamp-2 min-h-[2.7rem] text-[1.05rem] font-extrabold leading-snug text-[#011B33] transition group-hover:text-brand-accent dark:text-[#eef4ff]">
          <Link href={`/instructor/studio/${course.slug}`}>{course.title}</Link>
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat
            icon={BookOpen}
            value={course.lessons_count}
            label={course.lessons_count === 1 ? "Lesson" : "Lessons"}
          />
          <Stat
            icon={Users}
            value={course.enrollment_count}
            label={course.enrollment_count === 1 ? "Enrollment" : "Enrollments"}
          />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-[#011B33]/45 dark:text-[#eef4ff]/50">Enrollments vs your top course</span>
            <span className="tabular-nums text-brand-accent">{rankPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E7F1FC] dark:bg-white/10">
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-[#1457D0] to-[#10244F] transition duration-500 animate-rule-grow dark:from-[#5aa2ff] dark:to-[#8ec0ff]"
              style={{ width: `${Math.max(rankPct, course.enrollment_count > 0 ? 8 : 0)}%` }}
            />
          </div>
        </div>

        {footer ?? (
          <div className="mt-auto flex items-center gap-2 pt-5">
            <Link
              href={`/instructor/studio/${course.slug}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-[5px] bg-brand-accent text-sm font-semibold text-white transition duration-200 hover:bg-[#0f4bb8]"
            >
              Open studio
            </Link>
            <Link
              href={`/learn/${course.slug}?preview=1`}
              className="inline-flex h-10 items-center justify-center rounded-[5px] border border-brand-ink/15 px-3 text-sm font-semibold transition duration-200 hover:border-brand-accent hover:text-brand-accent"
            >
              Preview
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

export function InstructorCourseGrid({ courses }: { courses: InstructorCourseCardData[] }) {
  if (courses.length === 0) return null;
  const maxEnroll = Math.max(1, ...courses.map((row) => row.enrollment_count));

  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course, index) => (
        <li key={course.slug} className="animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
          <InstructorCourseCard
            course={course}
            rankPct={Math.round((course.enrollment_count / maxEnroll) * 100)}
            badge={index === 0 && courses.length > 1 && course.enrollment_count > 0 ? "Top course" : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
