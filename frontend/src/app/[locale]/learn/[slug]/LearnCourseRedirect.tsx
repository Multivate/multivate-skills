"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { AudioPhrasebookPlayer } from "@/components/player/AudioPhrasebookPlayer";

export default function LearnCourseRedirect({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const previewQs = preview ? "?preview=1" : "";
  const [error, setError] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setChecking(true);

      // Prefer phrasebook for audio courses.
      const phraseRes = await fetch(`/api/player/${encodeURIComponent(slug)}/phrasebook${preview ? "?preview=true" : ""}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (cancelled) return;

      if (phraseRes.status === 401) {
        router.replace(`/login?from=${encodeURIComponent(`/learn/${slug}${previewQs}`)}`);
        return;
      }

      if (phraseRes.ok) {
        setAudioMode(true);
        setChecking(false);
        return;
      }

      if (phraseRes.status === 404) {
        // Not an audio course - open video curriculum.
      } else {
        const data = await phraseRes.json().catch(() => null);
        setError(readApiError(data, "We couldn't open this course right now."));
        setChecking(false);
        return;
      }

      const res = await fetch(`/api/player/${encodeURIComponent(slug)}/curriculum${preview ? "?preview=true" : ""}`, {
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
        setChecking(false);
        return;
      }

      const lessons = Array.isArray((data as { lessons?: unknown })?.lessons)
        ? ((data as { lessons: { id: string; position: number }[] }).lessons as { id: string; position: number }[])
        : [];
      lessons.sort((a, b) => a.position - b.position);
      const first = lessons[0]?.id;

      if (!first) {
        setError("This course has no lessons yet. Add lessons in Course Studio, then try again.");
        setChecking(false);
        return;
      }

      router.replace(`/learn/${slug}/${first}${previewQs}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, previewQs, preview, router]);

  if (audioMode) {
    return <AudioPhrasebookPlayer slug={slug} preview={preview} />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg border border-brand-ink/10 bg-brand-surface p-8 text-center">
        <p className="text-sm leading-relaxed text-brand-ink/70">{error}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {preview ? (
            <Link href={`/dashboard/instructor/studio/${slug}`} className="btn-cta-accent !min-w-0 !px-4 !py-2.5 text-sm">
              Back to Course Studio
            </Link>
          ) : (
            <Link href="/dashboard/courses" className="btn-cta-accent !min-w-0 !px-4 !py-2.5 text-sm">
              My courses
            </Link>
          )}
          <Link href="/courses" className="btn-outline-brand !min-w-0 !px-4 !py-2.5 text-sm">
            Browse courses
          </Link>
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-brand-ink/50">Opening your course…</p>
      </div>
    );
  }

  return null;
}
