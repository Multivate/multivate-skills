"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { readApiError } from "@/lib/api-error";
import { useEffect, useState } from "react";
import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";

type UserRow = { id: string; name: string; email: string; role: string; is_active: boolean; created_at: string };
type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  user_email?: string;
  student_code?: string | null;
  payment_reference?: string | null;
  transaction_reference?: string | null;
  course_slug: string | null;
  course_title: string | null;
};
type EnrollRow = {
  user_name: string;
  user_email: string;
  course_title: string;
  course_slug: string;
  created_at: string;
  instructor_name?: string | null;
  instructor_email?: string | null;
};
type CourseRow = { slug: string; title: string; description: string; image_url: string; lessons_count: number };
type PendingCourse = { slug: string; title: string; status: string; lessons_count: number; image_url: string };
function ProfileField({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  if (value == null || value === "") return null;
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-slate-800">{value}</dd>
    </div>
  );
}

type StudentProfileRow = {
  user_id: string;
  user_name: string;
  user_email: string;
  education_level: string | null;
  current_skills: string | null;
  skills_to_learn: string | null;
  learning_goals: string | null;
  preferred_formats: string | null;
  weekly_hours: string | null;
  career_direction: string | null;
  extra_notes: string | null;
  updated_at: string;
};

type InstructorProfileRow = {
  user_id: string;
  user_name: string;
  user_email: string;
  expertise_areas: string;
  teaching_bio: string;
  subjects_taught: string;
  years_experience: string | null;
  teaching_formats: string | null;
  credentials_notes: string | null;
  professional_links: string | null;
  updated_at: string;
};

type AdminDashSnapshot = {
  totals: {
    total_users: number;
    total_courses: number;
    total_enrollments: number;
    revenue_completed_cents: number;
    payments_pending_count: number;
  };
};

type ReviewRow = {
  id: string;
  course_slug: string;
  course_title: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export function AdminSectionContent({ section }: { section: string }) {
  const tDash = useTranslations("dashboard");
  const tDm = useTranslations("dashboard.dataMgmt");
  const [dmDash, setDmDash] = useState<AdminDashSnapshot | null>(null);
  const [dmRows, setDmRows] = useState<EnrollRow[] | null>(null);
  const [dmErr, setDmErr] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollRow[] | null>(null);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [pendingCourses, setPendingCourses] = useState<PendingCourse[] | null>(null);
  const [instructors, setInstructors] = useState<UserRow[] | null>(null);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfileRow[] | null>(null);
  const [instructorProfiles, setInstructorProfiles] = useState<InstructorProfileRow[] | null>(null);
  const [adminReviews, setAdminReviews] = useState<ReviewRow[] | null>(null);
  const [analyticsDash, setAnalyticsDash] = useState<AdminDashSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      try {
        if (section === "instructors") {
          const res = await fetch("/api/admin/users?limit=100", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(readApiError(data, "We couldn't load users."));
            setInstructors([]);
            return;
          }
          const rows = Array.isArray(data) ? (data as UserRow[]) : [];
          setInstructors(rows.filter((u) => u.role === "instructor"));
          return;
        }
        if (section === "student-profiles") {
          const res = await fetch("/api/admin/student-learning-profiles?limit=200", {
            credentials: "include",
            cache: "no-store",
          });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load student profiles.");
            setStudentProfiles([]);
            return;
          }
          setStudentProfiles(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "instructor-profiles") {
          const res = await fetch("/api/admin/instructor-teaching-profiles?limit=200", {
            credentials: "include",
            cache: "no-store",
          });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load instructor profiles.");
            setInstructorProfiles([]);
            return;
          }
          setInstructorProfiles(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "users") {
          const res = await fetch("/api/admin/users?limit=100", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(readApiError(data, "We couldn't load users."));
            setUsers([]);
            return;
          }
          setUsers(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "payments") {
          const res = await fetch("/api/admin/payments?limit=100", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load payments.");
            setPayments([]);
            return;
          }
          setPayments(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "enrollments") {
          const res = await fetch("/api/admin/enrollments?limit=200", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load enrollments.");
            setEnrollments([]);
            return;
          }
          setEnrollments(Array.isArray(data) ? data : []);
          return;
        }
        if (section === "courses") {
          const [res, pendingRes] = await Promise.all([
            fetch("/api/courses", { cache: "no-store" }),
            fetch("/api/admin/courses/pending", { credentials: "include", cache: "no-store" }),
          ]);
          const data = await res.json().catch(() => null);
          const pendingData = await pendingRes.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr("We couldn't load the catalog.");
            setCourses([]);
          } else {
            setCourses(Array.isArray(data) ? data : []);
          }
          if (pendingRes.ok) {
            setPendingCourses(Array.isArray(pendingData) ? pendingData : []);
          } else {
            setPendingCourses([]);
          }
          return;
        }
        if (section === "reviews") {
          const res = await fetch("/api/admin/reviews?limit=200", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(readApiError(data, "We couldn't load reviews."));
            setAdminReviews([]);
            return;
          }
          setAdminReviews(Array.isArray(data) ? (data as ReviewRow[]) : []);
          return;
        }
        if (section === "analytics") {
          const res = await fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok || !data || typeof data !== "object" || !("totals" in data)) {
            setErr(readApiError(data, "We couldn't load analytics."));
            setAnalyticsDash(null);
            return;
          }
          setAnalyticsDash(data as AdminDashSnapshot);
        }
      } catch {
        if (!cancelled) setErr("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  useEffect(() => {
    if (section !== "data-management") return;
    let cancelled = false;
    (async () => {
      setDmErr(null);
      try {
        const [d1, d2] = await Promise.all([
          fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/enrollments?limit=12", { credentials: "include", cache: "no-store" }),
        ]);
        const j1 = await d1.json().catch(() => null);
        const j2 = await d2.json().catch(() => null);
        if (cancelled) return;
        if (!d1.ok || !j1 || typeof j1 !== "object" || !("totals" in j1)) {
          setDmErr(typeof (j1 as { detail?: string })?.detail === "string" ? (j1 as { detail: string }).detail : "We couldn't load the overview.");
          setDmDash(null);
          setDmRows([]);
          return;
        }
        if (!d2.ok) {
          setDmErr(typeof (j2 as { detail?: string })?.detail === "string" ? (j2 as { detail: string }).detail : "We couldn't load enrollments.");
          setDmRows([]);
        } else {
          setDmRows(Array.isArray(j2) ? (j2 as EnrollRow[]) : []);
        }
        setDmDash(j1 as AdminDashSnapshot);
      } catch {
        if (!cancelled) {
          setDmErr("Connection problem. Please try again.");
          setDmDash(null);
          setDmRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (section === "data-management") {
    if (dmErr) return <p className="text-sm text-red-800">{dmErr}</p>;
    if (dmDash === null || dmRows === null) {
      return <p className="text-sm text-slate-600">{tDm("loading")}</p>;
    }
    const { totals } = dmDash;
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 px-5 py-4 text-sm leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
          <p className="font-bold text-brand-ink dark:text-slate-100">{tDm("hubTitle")}</p>
          <p className="mt-2">{tDm("hubIntro")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tDm("cardStudentTitle")}</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{tDm("cardStudentBody")}</p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm font-bold text-admin-indigo hover:underline">
              {tDm("openStudentDash")}
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tDm("cardInstructorTitle")}</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{tDm("cardInstructorBody")}</p>
            <Link href="/dashboard/instructor/students" className="mt-4 inline-block text-sm font-bold text-admin-indigo hover:underline">
              {tDm("openInstructorStudents")}
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{tDm("cardAdminTitle")}</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{tDm("cardAdminBody")}</p>
            <Link href="/dashboard/admin/enrollments" className="mt-4 inline-block text-sm font-bold text-admin-indigo hover:underline">
              {tDm("openAdminEnrollments")}
            </Link>
          </div>
        </div>
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">{tDm("snapshotTitle")}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">{tDm("metricUsers")}</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_users}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">{tDm("metricCourses")}</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_courses}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-500">{tDm("metricEnrollments")}</dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_enrollments}</dd>
            </div>
          </dl>
        </section>
        <section className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {tDm("recentTitle")}
          </h2>
          {dmRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-600">{tDm("recentEmpty")}</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{tDm("colWhen")}</th>
                  <th className="px-4 py-3">{tDm("colLearner")}</th>
                  <th className="px-4 py-3">{tDm("colCourse")}</th>
                  <th className="px-4 py-3">{tDm("colInstructor")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dmRows.map((e) => (
                  <tr key={`${e.user_email}-${e.course_slug}-${e.created_at}`}>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-brand-ink">{e.user_name}</span>
                      <span className="block text-xs text-slate-500">{e.user_email}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-ink">{e.course_title}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {e.instructor_name || e.instructor_email ? (
                        <>
                          <span className="font-semibold text-brand-ink">{e.instructor_name ?? "-"}</span>
                          <span className="block">{e.instructor_email ?? ""}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    );
  }

  if (section === "instructors") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (instructors === null) return <p className="text-sm text-slate-600">Loading instructors…</p>;
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {instructors.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold text-brand-ink">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(u.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {instructors.length === 0 ? <p className="p-4 text-sm text-slate-600">No instructor-role accounts yet.</p> : null}
      </div>
    );
  }

  if (section === "instructor-profiles") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (instructorProfiles === null) return <p className="text-sm text-slate-600">Loading instructor teaching profiles…</p>;
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Onboarding questionnaire from instructors who completed registration (joined to name and email).
        </p>
        {instructorProfiles.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 text-sm text-slate-600 shadow-sm">
            No instructor teaching profiles yet.
          </p>
        ) : (
          <div className="space-y-3">
            {instructorProfiles.map((row) => (
              <details
                key={row.user_id}
                className="group rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm open:ring-1 open:ring-slate-200"
              >
                <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-brand-ink">{row.user_name}</p>
                      <p className="text-xs text-slate-600">{row.user_email}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      Updated {new Date(row.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-admin-indigo group-open:hidden">Click to expand full responses</p>
                </summary>
                <div className="border-t border-slate-100 px-4 py-4 text-sm sm:px-5">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label="Years experience" value={row.years_experience} />
                    <ProfileField label="Teaching formats" value={row.teaching_formats} />
                    <ProfileField label="Expertise" value={row.expertise_areas} wide />
                    <ProfileField label="Teaching bio" value={row.teaching_bio} wide />
                    <ProfileField label="Subjects taught" value={row.subjects_taught} wide />
                    <ProfileField label="Credentials" value={row.credentials_notes} wide />
                    <ProfileField label="Links" value={row.professional_links} wide />
                  </dl>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (section === "student-profiles") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (studentProfiles === null) return <p className="text-sm text-slate-600">Loading student learning profiles…</p>;
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Submitted questionnaire data from learners. Only students who have saved the form appear here.
        </p>
        {studentProfiles.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 text-sm text-slate-600 shadow-sm">
            No learning profiles saved yet.
          </p>
        ) : (
          <div className="space-y-3">
            {studentProfiles.map((row) => (
              <details
                key={row.user_id}
                className="group rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm open:ring-1 open:ring-slate-200"
              >
                <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-brand-ink">{row.user_name}</p>
                      <p className="text-xs text-slate-600">{row.user_email}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      Updated {new Date(row.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-admin-indigo group-open:hidden">Click to expand full responses</p>
                </summary>
                <div className="border-t border-slate-100 px-4 py-4 text-sm sm:px-5">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <ProfileField label="Education" value={row.education_level} />
                    <ProfileField label="Weekly hours" value={row.weekly_hours} />
                    <ProfileField label="Preferred formats" value={row.preferred_formats} />
                    <ProfileField label="Current skills" value={row.current_skills} wide />
                    <ProfileField label="Wants to learn" value={row.skills_to_learn} wide />
                    <ProfileField label="Learning goals" value={row.learning_goals} wide />
                    <ProfileField label="Career direction" value={row.career_direction} wide />
                    <ProfileField label="Extra notes" value={row.extra_notes} wide />
                  </dl>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (section === "analytics") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (analyticsDash === null) return <p className="text-sm text-slate-600">Loading analytics…</p>;
    const { totals } = analyticsDash;
    const money = (cents: number) =>
      new Intl.NumberFormat(undefined, { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(cents / 100);
    return (
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Users</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_users}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Courses</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_courses}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Enrollments</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.total_enrollments}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Completed revenue</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{money(totals.revenue_completed_cents)}</p>
          </div>
          <div className="rounded-2xl border border-admin-indigo/20 bg-violet-50/80 p-5 shadow-sm dark:border-admin-indigo/30 dark:bg-violet-950/20">
            <p className="text-xs font-bold uppercase tracking-wide text-admin-indigo">Pending payments</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-brand-ink">{totals.payments_pending_count}</p>
          </div>
        </section>
        <p className="text-sm text-slate-600">
          Platform-wide totals. Open enrollments or payments for detailed rows.
        </p>
      </div>
    );
  }

  if (section === "reviews") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (adminReviews === null) return <p className="text-sm text-slate-600">Loading reviews…</p>;
    if (adminReviews.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-sm leading-relaxed text-slate-600">No learner reviews yet. They appear here after enrolled students rate a course.</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {adminReviews.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/courses/${r.course_slug}`} className="font-semibold text-admin-indigo hover:underline">
                    {r.course_title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-ink">{r.reviewer_name}</p>
                  <p className="text-xs text-slate-500">{r.reviewer_email}</p>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums text-brand-ink">{r.rating} / 5</td>
                <td className="max-w-xs px-4 py-3 text-slate-700">{r.comment ? r.comment : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section === "certificates" || section === "system-logs") {
    return (
      <NotConfiguredNotice title={section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
        <p>
          This section is not available yet. Check back after the next update.
        </p>
      </NotConfiguredNotice>
    );
  }

  if (section === "users") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (users === null) return <p className="text-sm text-slate-600">Loading users…</p>;
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-semibold text-brand-ink">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{new Date(u.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-bold">{u.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section === "payments") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (payments === null) return <p className="text-sm text-slate-600">Loading payments…</p>;

    async function approvePayment(id: string) {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(id)}/approve`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setPayments((prev) =>
          prev ? prev.map((p) => (p.id === id ? { ...p, status: "paid" } : p)) : prev,
        );
      }
    }

    async function rejectPayment(id: string) {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(id)}/reject`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "We could not match this payment to a transfer." }),
      });
      if (res.ok) {
        setPayments((prev) =>
          prev ? prev.map((p) => (p.id === id ? { ...p, status: "failed" } : p)) : prev,
        );
      }
    }

    const needsReview = (status: string) => status === "pending" || status === "awaiting_review";

    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
          Confirm a payment only after you verify the bank transfer. Students are enrolled after you approve.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Bank txn</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-semibold">{p.user_email ?? "-"}</p>
                    {p.student_code ? <p className="font-mono text-slate-500">{p.student_code}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.payment_reference ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.transaction_reference ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{p.course_title ?? "-"}</td>
                  <td className="px-4 py-3 font-semibold">
                    {new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency }).format(
                      p.amount_cents / 100,
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold uppercase">{p.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {needsReview(p.status) ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void approvePayment(p.id)}
                          className="rounded-lg bg-admin-indigo px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void rejectPayment(p.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 transition hover:bg-red-100 active:scale-95"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (section === "enrollments") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (enrollments === null) return <p className="text-sm text-slate-600">Loading enrollments…</p>;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
          {tDash("adminEnrollmentsBlurb")}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Learner (student)</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Instructor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollments.map((e) => (
                <tr key={`${e.user_email}-${e.course_slug}-${e.created_at}`}>
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-brand-ink">{e.user_name}</p>
                    <p className="text-xs text-slate-500">{e.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/courses/${e.course_slug}`} className="font-semibold text-admin-indigo hover:underline">
                      {e.course_title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {e.instructor_name || e.instructor_email ? (
                      <>
                        <p className="font-semibold text-brand-ink">{e.instructor_name ?? "-"}</p>
                        <p className="text-xs text-slate-500">{e.instructor_email ?? ""}</p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (section === "courses") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (courses === null) return <p className="text-sm text-slate-600">Loading catalog…</p>;
    return (
      <div className="space-y-10">
        {pendingCourses && pendingCourses.length > 0 ? (
          <section>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Awaiting approval</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {pendingCourses.map((c) => (
                <div key={c.slug} className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <p className="font-bold text-brand-ink">{c.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{c.lessons_count} lessons · {c.slug}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/courses/${encodeURIComponent(c.slug)}/approve`, {
                          method: "POST",
                          credentials: "include",
                        });
                        if (res.ok) {
                          setPendingCourses((prev) => prev?.filter((x) => x.slug !== c.slug) ?? []);
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                      onClick={async () => {
                        const reason = window.prompt("Optional note for the instructor") ?? "";
                        const res = await fetch(`/api/admin/courses/${encodeURIComponent(c.slug)}/reject`, {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ reason }),
                        });
                        if (res.ok) {
                          setPendingCourses((prev) => prev?.filter((x) => x.slug !== c.slug) ?? []);
                        }
                      }}
                    >
                      Send back
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Published catalog</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {courses.map((c) => (
              <div key={c.slug} className="flex gap-3 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-4 shadow-sm">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  <CourseThumbnail src={c.image_url} alt={c.title} sizes="112px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-brand-ink">{c.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-600">{c.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{c.lessons_count} lessons · {c.slug}</p>
                  <Link href={`/courses/${c.slug}`} className="mt-2 inline-block text-xs font-bold text-admin-indigo hover:underline">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <NotConfiguredNotice title="Admin">
      <p>Unknown section.</p>
    </NotConfiguredNotice>
  );
}
