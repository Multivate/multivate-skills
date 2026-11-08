"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { InstructorCourseGrid } from "@/components/dashboard/InstructorCourseGrid";
import { InstructorKeyBoxes, instructorOverviewBoxes } from "@/components/dashboard/InstructorKeyBoxes";
import { StudentSurface } from "@/components/dashboard/StudentPageHero";
import { useAuth } from "@/contexts/auth-context";

type InstructorDashboard = {
  totals: {
    total_courses: number;
    total_enrollments: number;
    unique_learners: number;
    revenue_completed_cents: number;
  };
  courses: { slug: string; title: string; image_url: string; lessons_count: number; enrollment_count: number }[];
};

function greetingFor(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export function InstructorDashboardHome() {
  const { user } = useAuth();
  const [data, setData] = useState<InstructorDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/instructor/dashboard", { credentials: "include", cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setError("You do not have access to the instructor area.");
          return;
        }
        if (!res.ok) {
          setError(typeof body?.detail === "string" ? body.detail : "We couldn't load your dashboard.");
          return;
        }
        setData(body as InstructorDashboard);
        setError(null);
      } catch {
        if (!cancelled) setError("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ranked = useMemo(() => {
    const list = data?.courses ?? [];
    return [...list].sort((a, b) => b.enrollment_count - a.enrollment_count);
  }, [data]);

  const featured = ranked[0] ?? null;

  if (error) {
    return (
      <StudentSurface>
        <p className="text-sm text-red-700">{error}</p>
      </StudentSurface>
    );
  }

  if (!data) {
    return (
      <StudentSurface>
        <div className="min-h-[70vh] animate-pulse space-y-8">
          <div className="h-10 w-72 rounded bg-brand-ink/10" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-36 rounded-[5px] bg-brand-ink/10" />
            <div className="h-36 rounded-[5px] bg-brand-ink/10" />
            <div className="h-36 rounded-[5px] bg-brand-ink/10" />
            <div className="h-36 rounded-[5px] bg-brand-ink/10" />
          </div>
          <div className="h-52 rounded-[5px] bg-brand-ink/10" />
        </div>
      </StudentSurface>
    );
  }

  const { totals } = data;
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <StudentSurface>
      <div className="space-y-10">
        <header className="flex flex-col gap-5 animate-fade-up sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-[#011B33]/50 dark:text-[#eef4ff]/55">{weekday}</p>
            <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight text-[#011B33] dark:text-[#eef4ff] sm:text-[2.15rem]">
              {greetingFor(firstName)}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#011B33]/60">
              {totals.total_courses === 0
                ? "Create a course, then add lessons in Studio."
                : "Studio, students, and completed payments — live from your account."}
            </p>
          </div>
          <Link
            href="/instructor/studio/new"
            className="inline-flex h-11 w-fit items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white transition duration-200 hover:bg-[#0f4bb8] hover:shadow-[0_10px_24px_rgba(20,87,208,0.28)]"
          >
            New course
          </Link>
        </header>

        <InstructorKeyBoxes items={instructorOverviewBoxes(totals)} />

        {featured ? (
          <section className="animate-fade-up-delay">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-extrabold">Your courses</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                <Link href="/instructor/studio" className="text-brand-accent hover:underline">
                  Open studio
                </Link>
                <Link href="/instructor/analytics" className="text-[#011B33]/60 hover:text-brand-accent">
                  Analytics
                </Link>
                <Link href="/instructor/students" className="text-[#011B33]/60 hover:text-brand-accent">
                  Students
                </Link>
              </div>
            </div>
            <InstructorCourseGrid courses={ranked} />
          </section>
        ) : (
          <section className="rounded-[5px] border border-dashed border-brand-ink/20 px-6 py-14 text-center animate-fade-up-delay">
            <p className="text-lg font-extrabold">Your studio is empty</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#011B33]/60">
              Start a course, add a cover and lessons, then submit it for review. Students see it after it goes live.
            </p>
            <Link
              href="/instructor/studio/new"
              className="mt-6 inline-flex h-11 items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white transition duration-200 hover:bg-[#0f4bb8]"
            >
              Create course
            </Link>
          </section>
        )}
      </div>
    </StudentSurface>
  );
}
