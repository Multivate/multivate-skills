"use client";

import { StudentPageHero, StudentSurface } from "@/components/dashboard/StudentPageHero";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type MyCourseItem = {
  slug: string;
  title: string;
  lessons: number;
  lesson_done: number;
  progress_pct: number;
  status?: string;
  instructor_name?: string | null;
};

const STATUS_PILL: Record<string, string> = {
  Completed: "bg-[#E5F6EC] text-[#1F8A4C]",
  "In Progress": "bg-[#E7F1FC] text-[#1457D0]",
};

export default function DashboardProgressPage() {
  const [items, setItems] = useState<MyCourseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't load your progress.");
        setItems([]);
        return;
      }
      setError(null);
      setItems(Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <StudentPageHero title="Progress" subtitle="Lesson counts update when you finish videos and quizzes. Nothing is estimated." />
      <StudentSurface>
        {items === null ? <p className="text-sm text-[#6a6f73]">Loading progress…</p> : null}
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {items && items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#6a6f73]">
              You are not enrolled in any courses yet.{" "}
              <Link href="/courses" className="font-bold text-[#1457D0]">
                Browse the catalog
              </Link>
              .
            </p>
          </div>
        ) : null}
        {items && items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((course) => (
              <li key={course.slug} className="rounded border border-[#d1d7dc] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold">{course.title}</p>
                    <p className="mt-1 text-xs text-[#6a6f73]">
                      {course.lesson_done} of {course.lessons} items completed
                      {course.instructor_name ? ` · ${course.instructor_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {course.status ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[course.status] ?? "bg-[#FFF4DE] text-[#A56B00]"}`}>
                        {course.status}
                      </span>
                    ) : null}
                    <span className="text-sm font-bold tabular-nums">{course.progress_pct}%</span>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#d1d7dc]">
                  <div className="h-full rounded-full bg-[#1457D0]" style={{ width: `${Math.min(100, course.progress_pct)}%` }} />
                </div>
                <Link href={`/learn/${course.slug}`} className="mt-4 inline-block text-sm font-bold text-[#1457D0]">
                  Continue learning
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </StudentSurface>
    </>
  );
}
