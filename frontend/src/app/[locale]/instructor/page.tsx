"use client";

import { InstructorDashboardHome } from "@/components/dashboard/InstructorDashboardHome";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/navigation";

export default function InstructorHomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="px-4 py-16 text-sm text-brand-ink/60">
        Loading your dashboard…
      </div>
    );
  }

  if (user?.role === "instructor" || user?.role === "admin") {
    return <InstructorDashboardHome key={user.id} />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">Instructor workspace</h1>
      <p className="mt-3 text-sm leading-relaxed text-brand-ink/70">
        Course Studio and the instructor dashboard are for instructor accounts. Create an instructor account, or sign in if you already have one.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/register?intent=instructor" className="btn-cta-accent inline-flex h-11 items-center px-5">
          Apply as an instructor
        </Link>
        <Link href="/login?from=/instructor" className="inline-flex h-11 items-center text-sm font-semibold text-brand-accent">
          Sign in
        </Link>
      </div>
    </div>
  );
}
