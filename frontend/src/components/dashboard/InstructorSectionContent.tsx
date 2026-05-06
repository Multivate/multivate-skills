"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { CreateCourseForm } from "@/components/dashboard/CreateCourseForm";
import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";

type StudentRow = {
  user_id: string;
  user_name: string;
  user_email: string;
  course_slug: string;
  course_title: string;
  enrolled_at: string;
};

export function InstructorSectionContent({ section }: { section: string }) {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (section !== "students") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/instructor/students?limit=200", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setErr(typeof data?.detail === "string" ? data.detail : "Could not load students.");
          setStudents([]);
          return;
        }
        setStudents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setErr("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (section === "create-course") {
    return <CreateCourseForm />;
  }

  if (section === "students") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (students === null) return <p className="text-sm text-slate-600">Loading enrollments…</p>;
    if (students.length === 0) {
      return <p className="text-sm text-slate-600">No learners are enrolled in your courses yet.</p>;
    }
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Enrolled</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Course</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={`${s.user_id}-${s.course_slug}-${s.enrolled_at}`}>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(s.enrolled_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-ink">{s.user_name}</p>
                  <p className="text-xs text-slate-500">{s.user_email}</p>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/courses/${s.course_slug}`} className="font-semibold text-instructor-purple hover:underline">
                    {s.course_title}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section === "content-upload" || section === "analytics" || section === "earnings" || section === "reviews") {
    return (
      <NotConfiguredNotice title={section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
        <p>
          This workflow is not implemented in the API yet. Use <strong>Create course</strong>, the public course page,
          and the <strong>Students</strong> list for real teaching data today.
        </p>
      </NotConfiguredNotice>
    );
  }

  return <NotConfiguredNotice title="Instructor">Unknown section.</NotConfiguredNotice>;
}
