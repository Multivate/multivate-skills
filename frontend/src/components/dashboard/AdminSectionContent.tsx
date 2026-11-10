"use client";

import { Link } from "@/i18n/navigation";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";
import { readApiError } from "@/lib/api-error";
import { useCallback, useEffect, useState } from "react";
import { AdminPeopleTable, AdminProfileCards, profileLabel } from "@/components/dashboard/AdminPeoplePanels";
import { AdminEnrollmentsPanel } from "@/components/dashboard/AdminEnrollmentsPanel";
import { AdminDiscountCodes } from "@/components/dashboard/AdminDiscountCodes";
import { AdminMentorApprovals } from "@/components/dashboard/AdminMentorApprovals";
import { AdminPaymentsPanel } from "@/components/dashboard/AdminPaymentsPanel";
import { AdminAnalyticsDashboard, type AdminAnalyticsData } from "@/components/dashboard/AdminAnalyticsDashboard";
import { AdminDataManagement } from "@/components/dashboard/AdminDataManagement";
import { AdminSecurity } from "@/components/dashboard/AdminSecurity";
import { AdminSystemLogs } from "@/components/dashboard/AdminSystemLogs";
import { DashboardState } from "@/components/dashboard/dashboard-ui";
import { NotConfiguredNotice } from "@/components/dashboard/NotConfiguredNotice";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { useRealtimePoll } from "@/hooks/useRealtimePoll";

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
  goal_code?: string | null;
  german_level?: string | null;
  instruction_locale?: string | null;
  study_mode?: string | null;
  campus_location?: string | null;
  cohort_name?: string | null;
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

function AdminStudentPlacement({
  row,
  onSaved,
}: {
  row: StudentProfileRow;
  onSaved: (next: StudentProfileRow) => void;
}) {
  const [studyMode, setStudyMode] = useState(row.study_mode || "online");
  const [campus, setCampus] = useState(row.campus_location ?? "");
  const [cohort, setCohort] = useState(row.cohort_name ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/student-learning-profiles/${row.user_id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_mode: studyMode,
          campus_location: studyMode === "online" ? "" : campus,
          cohort_name: studyMode === "online" ? "" : cohort,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(typeof data?.detail === "string" ? data.detail : "Could not save placement.");
        return;
      }
      onSaved(data as StudentProfileRow);
      setMsg("Saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-4 grid gap-3 border-t border-[var(--admin-line)] pt-4 sm:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="block text-xs font-semibold">
        Enrolment
        <select
          value={studyMode}
          onChange={(event) => setStudyMode(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--admin-line)] bg-white px-2 py-2 text-sm"
        >
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
          <option value="physical">Physical</option>
        </select>
      </label>
      <label className="block text-xs font-semibold">
        Campus
        <input
          value={campus}
          onChange={(event) => setCampus(event.target.value)}
          disabled={studyMode === "online"}
          placeholder="Ibadan, Oyo state"
          className="mt-1 w-full rounded-lg border border-[var(--admin-line)] px-2 py-2 text-sm disabled:opacity-50"
        />
      </label>
      <label className="block text-xs font-semibold">
        Cohort
        <input
          value={cohort}
          onChange={(event) => setCohort(event.target.value)}
          disabled={studyMode === "online"}
          className="mt-1 w-full rounded-lg border border-[var(--admin-line)] px-2 py-2 text-sm disabled:opacity-50"
        />
      </label>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={busy}
          className="h-9 rounded-lg bg-brand-ink px-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          Save placement
        </button>
        {msg ? <p className="text-xs text-[#011B33]/60">{msg}</p> : null}
      </div>
    </form>
  );
}

export function AdminSectionContent({ section }: { section: string }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollRow[] | null>(null);
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [pendingCourses, setPendingCourses] = useState<PendingCourse[] | null>(null);
  const [instructors, setInstructors] = useState<UserRow[] | null>(null);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfileRow[] | null>(null);
  const [instructorProfiles, setInstructorProfiles] = useState<InstructorProfileRow[] | null>(null);
  const [adminReviews, setAdminReviews] = useState<ReviewRow[] | null>(null);
  const [analyticsDash, setAnalyticsDash] = useState<AdminAnalyticsData | null>(null);
  const [analyticsUpdatedAt, setAnalyticsUpdatedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paymentBusyId, setPaymentBusyId] = useState<string | null>(null);
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);
  const [courseMsg, setCourseMsg] = useState<string | null>(null);
  const [courseBusySlug, setCourseBusySlug] = useState<string | null>(null);

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
            fetch("/api/courses", { credentials: "include", cache: "no-store" }),
            fetch("/api/admin/courses/pending", { credentials: "include", cache: "no-store" }),
          ]);
          const data = await res.json().catch(() => null);
          const pendingData = await pendingRes.json().catch(() => null);
          if (cancelled) return;
          if (!res.ok) {
            setErr(readApiError(data, "We couldn't load the catalog."));
            setCourses([]);
          } else {
            setCourses(Array.isArray(data) ? data : []);
          }
          if (!pendingRes.ok) {
            setErr((prev) => prev ?? readApiError(pendingData, "We couldn't load courses waiting for review."));
            setPendingCourses([]);
          } else {
            setPendingCourses(Array.isArray(pendingData) ? pendingData : []);
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
        }
      } catch {
        if (!cancelled) setErr("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data !== "object" || !("totals" in data)) {
        setErr(readApiError(data, "We couldn't load analytics."));
        return;
      }
      setAnalyticsDash(data as AdminAnalyticsData);
      setAnalyticsUpdatedAt(new Date());
      setErr(null);
    } catch {
      setErr("Connection problem. Please try again.");
    }
  }, []);

  useRealtimePoll(section === "analytics", loadAnalytics);

  if (section === "data-management") {
    return <AdminDataManagement />;
  }

  if (section === "instructors") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (instructors === null) return <p className="admin-muted text-sm">Loading instructors…</p>;
    return <AdminPeopleTable rows={instructors} empty="No instructor accounts yet." showRole={false} />;
  }

  if (section === "instructor-profiles") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (instructorProfiles === null) return <p className="admin-muted text-sm">Loading instructor teaching profiles…</p>;
    return (
      <AdminProfileCards
        empty="No instructor teaching profiles yet."
        rows={instructorProfiles.map((row) => ({
          user_id: row.user_id,
          user_name: row.user_name,
          user_email: row.user_email,
          updated_at: row.updated_at,
          answers: [
            { label: "Years experience", value: profileLabel("years", row.years_experience) },
            { label: "Teaching formats", value: row.teaching_formats },
            { label: "Expertise", value: row.expertise_areas, wide: true },
            { label: "Teaching bio", value: row.teaching_bio, wide: true },
            { label: "Subjects taught", value: profileLabel("language", row.subjects_taught), wide: true },
            {
              label: "Credentials",
              value: /^teach_with:[a-z]{2}$/i.test(row.credentials_notes ?? "") ? null : row.credentials_notes,
              wide: true,
            },
            { label: "Links", value: row.professional_links, wide: true },
          ],
        }))}
      />
    );
  }

  if (section === "student-profiles") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (studentProfiles === null) return <p className="admin-muted text-sm">Loading student learning profiles…</p>;
    return (
      <AdminProfileCards
        empty="No learning profiles saved yet."
        rows={studentProfiles.map((row) => ({
          user_id: row.user_id,
          user_name: row.user_name,
          user_email: row.user_email,
          updated_at: row.updated_at,
          answers: [
            { label: "Goal", value: row.goal_code || row.career_direction || null },
            { label: "German level", value: row.german_level || row.current_skills || null },
            { label: "Teaches in", value: row.instruction_locale ?? null },
            { label: "Weekly hours", value: profileLabel("weekly", row.weekly_hours) },
            { label: "Study mode", value: row.study_mode },
            { label: "Campus", value: row.campus_location },
            { label: "Cohort", value: row.cohort_name },
            { label: "Preferred formats", value: row.preferred_formats },
            { label: "Wants to learn", value: row.skills_to_learn, wide: true },
            { label: "Learning goals", value: profileLabel("language", row.learning_goals), wide: true },
            {
              label: "Extra notes",
              value: /^learn_with:[a-z]{2}$/i.test(row.extra_notes ?? "") ? null : row.extra_notes,
              wide: true,
            },
          ],
          footer: (
            <AdminStudentPlacement
              row={row}
              onSaved={(next) => {
                setStudentProfiles((current) =>
                  (current ?? []).map((item) => (item.user_id === next.user_id ? { ...item, ...next } : item)),
                );
              }}
            />
          ),
        }))}
      />
    );
  }

  if (section === "analytics") {
    if (err) {
      return (
        <DashboardState tone="error">
          <p className="font-semibold">{err}</p>
        </DashboardState>
      );
    }
    if (analyticsDash === null) {
      return <DashboardState>Loading analytics…</DashboardState>;
    }
    return <AdminAnalyticsDashboard data={analyticsDash} lastUpdated={analyticsUpdatedAt} live />;
  }

  if (section === "reviews") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (adminReviews === null) return <p className="text-sm text-neutral-500">Loading reviews…</p>;
    if (adminReviews.length === 0) {
      return (
        <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-12 text-center dark:border-zinc-700/50 dark:bg-zinc-900/50">
          <p className="text-sm leading-relaxed text-neutral-500">No learner reviews yet. They appear here after enrolled students rate a course.</p>
        </div>
      );
    }
    return (
      <div className="admin-card overflow-x-auto rounded-md">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs font-bold uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {adminReviews.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-neutral-500">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/courses/${r.course_slug}`} className="font-semibold text-brand-accent hover:underline">
                    {r.course_title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-brand-ink">{r.reviewer_name}</p>
                  <p className="text-xs text-neutral-500">{r.reviewer_email}</p>
                </td>
                <td className="px-4 py-3 font-bold tabular-nums text-brand-ink">{r.rating} / 5</td>
                <td className="max-w-xs px-4 py-3 text-zinc-700">{r.comment ? r.comment : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section === "security") {
    return <AdminSecurity />;
  }

  if (section === "system-logs") {
    return <AdminSystemLogs />;
  }

  if (section === "certificates") {
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
    if (users === null) return <p className="admin-muted text-sm">Loading users…</p>;
    return <AdminPeopleTable rows={users} empty="No accounts yet." />;
  }

  if (section === "payments") {
    return <AdminPaymentsPanel />;
  }

  if (section === "enrollments") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (enrollments === null) return <p className="text-sm text-neutral-500">Loading enrollments…</p>;
    return <AdminEnrollmentsPanel rows={enrollments} />;
  }

  if (section === "courses") {
    if (err) return <p className="text-sm text-red-800">{err}</p>;
    if (courses === null) return <p className="text-sm text-neutral-500">Loading catalog…</p>;

    async function reloadCatalog() {
      const [res, pendingRes] = await Promise.all([
        fetch("/api/courses", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/courses/pending", { credentials: "include", cache: "no-store" }),
      ]);
      const data = await res.json().catch(() => null);
      const pendingData = await pendingRes.json().catch(() => null);
      if (res.ok && Array.isArray(data)) setCourses(data as CourseRow[]);
      if (pendingRes.ok && Array.isArray(pendingData)) setPendingCourses(pendingData as PendingCourse[]);
    }

    async function approveCourse(slug: string) {
      setCourseMsg(null);
      setCourseBusySlug(slug);
      try {
        const res = await fetch(`/api/admin/courses/${encodeURIComponent(slug)}/approve`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setCourseMsg(readApiError(data, "We couldn't approve that course."));
          return;
        }
        setCourseMsg("Course approved. It will appear in the catalog shortly.");
        await reloadCatalog();
      } catch {
        setCourseMsg("Connection problem. Please try again.");
      } finally {
        setCourseBusySlug(null);
      }
    }

    async function rejectCourse(slug: string) {
      const reason = window.prompt("Optional note for the instructor") ?? "";
      setCourseMsg(null);
      setCourseBusySlug(slug);
      try {
        const res = await fetch(`/api/admin/courses/${encodeURIComponent(slug)}/reject`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setCourseMsg(readApiError(data, "We couldn't send that course back."));
          return;
        }
        setCourseMsg("Course sent back to the instructor.");
        await reloadCatalog();
      } catch {
        setCourseMsg("Connection problem. Please try again.");
      } finally {
        setCourseBusySlug(null);
      }
    }

    return (
      <div className="space-y-10">
        {courseMsg ? (
          <p
            className={`rounded-md px-4 py-3 text-sm font-medium ${
              courseMsg.includes("approved") || courseMsg.includes("sent back")
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {courseMsg}
          </p>
        ) : null}
        {pendingCourses && pendingCourses.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Awaiting approval</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {pendingCourses.map((c) => (
                <div key={c.slug} className="rounded-md border border-amber-200/90 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <p className="font-bold text-brand-ink">{c.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{c.lessons_count} lessons · {c.slug}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/learn/${c.slug}?preview=1`}
                      className="rounded-sm border border-brand-primary/30 bg-brand-muted px-3 py-1.5 text-xs font-bold text-brand-primary transition hover:bg-brand-muted"
                    >
                      Preview
                    </Link>
                    <button
                      type="button"
                      disabled={courseBusySlug === c.slug}
                      className="rounded-sm bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      onClick={() => void approveCourse(c.slug)}
                    >
                      {courseBusySlug === c.slug ? "Saving…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={courseBusySlug === c.slug}
                      className="rounded-sm border border-neutral-300 bg-brand-surface px-3 py-1.5 text-xs font-bold text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-neutral-100"
                      onClick={() => void rejectCourse(c.slug)}
                    >
                      Send back
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-md border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-10 text-center dark:border-zinc-700/50 dark:bg-zinc-900/50">
            <p className="text-sm text-neutral-500">No courses are waiting for review right now.</p>
          </section>
        )}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Published catalog</h2>
          {courses.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No live courses yet. Approve a submitted course to show it here.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {courses.map((c) => (
                <div key={c.slug} className="admin-card flex gap-3 rounded-md p-4">
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
                    <CourseThumbnail src={c.image_url} alt={c.title} sizes="112px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-brand-ink">{c.title}</p>
                    <p className="line-clamp-2 text-xs text-neutral-500">{c.description}</p>
                    <p className="mt-1 text-xs text-neutral-500">{c.lessons_count} lessons · {c.slug}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Link href={`/courses/${c.slug}`} className="text-xs font-bold text-brand-accent hover:underline">
                        Course page
                      </Link>
                      <Link href={`/learn/${c.slug}`} className="text-xs font-bold text-brand-accent hover:underline">
                        Watch
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (section === "discount-codes") {
    return <AdminDiscountCodes />;
  }

  if (section === "mentors") {
    return <AdminMentorApprovals />;
  }

  return (
    <NotConfiguredNotice title="Admin">
      <p>Unknown section.</p>
    </NotConfiguredNotice>
  );
}
