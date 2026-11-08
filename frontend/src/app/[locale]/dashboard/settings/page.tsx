"use client";

import { AccountSettings } from "@/components/dashboard/AccountSettings";
import { CourseRatingPanel } from "@/components/dashboard/CourseRatingPanel";
import { StudentPageHero, StudentSurface } from "@/components/dashboard/StudentPageHero";
import { useAuth } from "@/contexts/auth-context";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function DashboardSettingsPage() {
  const t = useTranslations("dashboard.settings");
  const { user } = useAuth();
  const [courses, setCourses] = useState<{ slug: string; title: string }[]>([]);
  const isStudent = user?.role === "student";
  const isDesk = user?.role === "mentor" || user?.role === "instructor";

  useEffect(() => {
    if (!isStudent) return;
    void fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCourses(data.map((row: { slug: string; title: string }) => ({ slug: row.slug, title: row.title })));
        }
      })
      .catch(() => undefined);
  }, [isStudent]);

  return (
    <>
      {isDesk ? null : <StudentPageHero title={t("title")} subtitle={t("subtitle")} />}
      <StudentSurface>
        <div className="mx-auto max-w-3xl space-y-6">
          {isDesk ? (
            <header>
              <p className="text-sm text-[#011B33]/50">Account</p>
              <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">{t("title")}</h1>
              <p className="mt-2 text-sm text-[#011B33]/60">{t("subtitle")}</p>
            </header>
          ) : null}
          <div className={isDesk ? "rounded-[5px] border border-brand-ink/10 bg-white p-6 shadow-[0_8px_24px_rgba(16,36,79,0.04)]" : ""}>
            <AccountSettings hideHeader />
          </div>
          {isStudent && courses.length > 0 ? (
            <div className="border-t border-brand-ink/10 pt-4">
              <CourseRatingPanel courses={courses} />
            </div>
          ) : null}
        </div>
      </StudentSurface>
    </>
  );
}
