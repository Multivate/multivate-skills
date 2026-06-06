"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";

export default function LearnCourseRedirect({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const previewQs = preview ? "?preview=1" : "";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const res = await fetch(`/api/player/${encodeURIComponent(slug)}/curriculum${previewQs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (cancelled) return;

      if (res.status === 401) {
        router.replace(`/login?from=${encodeURIComponent(`/learn/${slug}${previewQs}`)}`);
        return;
      }

      if (!res.ok) {
        setError(readApiError(data, "We couldn't open this course right now."));
        return;
      }

      const lessons = Array.isArray((data as { lessons?: unknown })?.lessons)
        ? ((data as { lessons: { id: string; position: number }[] }).lessons as { id: string; position: number }[])
        : [];
      lessons.sort((a, b) => a.position - b.position);
      const first = lessons[0]?.id;

      if (!first) {
        setError("This course has no lessons yet. Add lessons in Course Studio, then try again.");
        return;
      }

      router.replace(`/learn/${slug}/${first}${previewQs}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, previewQs, preview, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm leading-relaxed text-slate-700">{error}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {preview ? (
            <Link
              href={`/dashboard/instructor/studio/${slug}`}
              className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Back to Course Studio
            </Link>
          ) : (
            <Link
              href="/dashboard/courses"
              className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              My courses
            </Link>
          )}
          <Link
            href="/courses"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Browse courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="animate-pulse text-sm text-slate-500">Opening your course…</p>
    </div>
  );
}
