"use client";

import { useEffect, useState } from "react";
import { MyLearningHabits } from "@/components/dashboard/MyLearningHabits";
import { Link } from "@/i18n/navigation";

type MyCourseItem = {
  slug: string;
  title: string;
  lessons: number;
  lesson_done: number;
  progress_pct: number;
  status: string;
};

export function LearningToolsPanel() {
  const [items, setItems] = useState<MyCourseItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!cancelled && res.ok && Array.isArray(data)) {
        setItems(data as MyCourseItem[]);
      } else if (!cancelled) {
        setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const inProgress = (items ?? []).filter((row) => row.progress_pct > 0 && row.progress_pct < 100).length;
  const done = (items ?? []).filter((row) => row.progress_pct >= 100).length;

  return (
    <div className="space-y-6">
      <MyLearningHabits />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/progress" className="rounded border border-[#d1d7dc] p-5 hover:border-[#1457D0]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6a6f73]">Progress</p>
          <p className="mt-2 text-2xl font-bold">{items === null ? "-" : `${inProgress} in progress`}</p>
          <p className="mt-1 text-sm text-[#6a6f73]">{done} completed</p>
        </Link>
        <Link href="/dashboard/certificates" className="rounded border border-[#d1d7dc] p-5 hover:border-[#1457D0]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6a6f73]">Certificates</p>
          <p className="mt-2 text-2xl font-bold">Claim when you finish</p>
          <p className="mt-1 text-sm text-[#6a6f73]">Codes you can share with employers.</p>
        </Link>
        <Link href="/dashboard/book-1on1" className="rounded border border-[#d1d7dc] p-5 hover:border-[#1457D0]">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6a6f73]">Mentors</p>
          <p className="mt-2 text-2xl font-bold">Book a mentor</p>
          <p className="mt-1 text-sm text-[#6a6f73]">Talk with someone already in Germany.</p>
        </Link>
      </div>
      {items && items.length > 0 ? (
        <section className="rounded border border-[#d1d7dc] p-5">
          <h2 className="text-lg font-bold">Where you left off</h2>
          <ul className="mt-4 space-y-3">
            {items.slice(0, 4).map((course) => (
              <li key={course.slug} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f7f9fa] pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold">{course.title}</p>
                  <p className="text-xs text-[#6a6f73]">
                    {course.lesson_done}/{course.lessons} · {course.progress_pct}%
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Link href={`/learn/${course.slug}/listen`} className="text-sm font-bold text-[#1457D0]">
                    Listening session
                  </Link>
                  <Link href={`/learn/${course.slug}`} className="text-sm font-bold text-[#1457D0]">
                    Continue
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
