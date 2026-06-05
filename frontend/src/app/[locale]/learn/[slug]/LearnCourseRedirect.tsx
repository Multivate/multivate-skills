"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function LearnCourseRedirect({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1" ? "?preview=1" : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/player/${encodeURIComponent(slug)}/curriculum${preview}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      const lessons = Array.isArray((data as { lessons?: unknown })?.lessons)
        ? ((data as { lessons: { id: string; position: number }[] }).lessons as { id: string; position: number }[])
        : [];
      lessons.sort((a, b) => a.position - b.position);
      const first = lessons[0]?.id;
      if (first) {
        router.replace(`/learn/${slug}/${first}${preview}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, preview, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="animate-pulse text-sm text-slate-500">Opening your course…</p>
    </div>
  );
}
