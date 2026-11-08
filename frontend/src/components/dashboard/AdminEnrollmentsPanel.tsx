"use client";

import { DonutChart, TopCoursesBarChart } from "@/components/dashboard/admin-analytics-charts";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { Link } from "@/i18n/navigation";

type EnrollRow = {
  user_name: string;
  user_email: string;
  course_title: string;
  course_slug: string;
  created_at: string;
  instructor_name?: string | null;
  instructor_email?: string | null;
};

function timeAgo(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return minutes < 1 ? "Just now" : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function AdminEnrollmentsPanel({ rows }: { rows: EnrollRow[] }) {
  const byCourse = new Map<string, { title: string; enrollment_count: number }>();
  const byInstructor = new Map<string, number>();
  for (const row of rows) {
    const course = byCourse.get(row.course_slug) ?? { title: row.course_title, enrollment_count: 0 };
    course.enrollment_count += 1;
    byCourse.set(row.course_slug, course);
    const instructor = row.instructor_name || row.instructor_email || "Unassigned";
    byInstructor.set(instructor, (byInstructor.get(instructor) ?? 0) + 1);
  }
  const courses = [...byCourse.values()].sort((a, b) => b.enrollment_count - a.enrollment_count);
  const instructors = [...byInstructor.entries()].map(([label, value], index) => ({
    label,
    value,
    color: ["#1457D0", "#7C5CDB", "#1F8A4C", "#E07A2F"][index % 4],
  }));

  return (
    <div className="space-y-5">
      {rows.length === 0 ? (
        <p className="admin-muted text-sm">No enrollments yet.</p>
      ) : courses.length > 1 || instructors.length > 1 ? (
        <div className={`grid gap-4 ${courses.length > 1 && instructors.length > 1 ? "xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]" : ""}`}>
          {courses.length > 1 ? (
            <section className="admin-card rounded-2xl p-5 sm:p-6">
              <h2 className="text-base font-semibold">Enrollments by course</h2>
              <p className="admin-muted mt-1 text-xs">
                {rows.length} enrollment{rows.length === 1 ? "" : "s"} across {courses.length} courses
              </p>
              <div className="mt-4">
                <TopCoursesBarChart courses={courses} />
              </div>
            </section>
          ) : null}
          {instructors.length > 1 ? (
            <section className="admin-card rounded-2xl p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold">By instructor</h2>
              <DonutChart segments={instructors} centerLabel={String(rows.length)} />
            </section>
          ) : null}
        </div>
      ) : null}

      <section className="admin-card overflow-hidden rounded-2xl">
        <div className="px-5 py-4">
          <h2 className="text-base font-semibold">Roster</h2>
          <p className="admin-muted mt-1 text-xs">Who joined which course</p>
        </div>
        {rows.length === 0 ? null : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="admin-muted border-y border-[var(--admin-line)] text-[11px] font-semibold uppercase tracking-[0.12em]">
                  <th className="px-5 py-2 font-semibold">Learner</th>
                  <th className="px-3 py-2 font-semibold">Course</th>
                  <th className="px-3 py-2 font-semibold">Instructor</th>
                  <th className="px-5 py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.user_email}-${row.course_slug}-${row.created_at}`} className="border-b border-[var(--admin-line)] last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PersonMark name={row.user_name || row.user_email} className="h-9 w-9 text-xs" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{row.user_name}</p>
                          <p className="admin-muted truncate text-xs">{row.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/courses/${row.course_slug}`} className="font-semibold text-[#1457D0]">
                        {row.course_title}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      {row.instructor_name || row.instructor_email ? (
                        <div className="flex items-center gap-2">
                          <PersonMark name={row.instructor_name || row.instructor_email || "Instructor"} className="h-7 w-7 text-[10px]" />
                          <span className="truncate">{row.instructor_name || row.instructor_email}</span>
                        </div>
                      ) : (
                        <span className="admin-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="admin-muted px-5 py-3">{timeAgo(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
