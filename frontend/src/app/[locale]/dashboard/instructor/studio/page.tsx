"use client";

import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StudentSurface } from "@/components/dashboard/StudentPageHero";
import { StudioQuietLink, StudioStatusPill } from "@/components/studio/studio-ui";
import { resolveCourseImageUrl } from "@/lib/course-image";

type Row = {
  slug: string;
  title: string;
  status: string;
  format?: string;
  lessons_count: number;
  image_url: string;
  updated_at: string;
};

function formatUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function InstructorStudioListPage() {
  return (
    <Suspense
      fallback={
        <StudentSurface>
          <div className="min-h-[40vh] animate-pulse rounded-[5px] bg-brand-ink/10" />
        </StudentSurface>
      }
    >
      <StudioList />
    </Suspense>
  );
}

function StudioList() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/studio/courses", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setErr(typeof data?.detail === "string" ? data.detail : "We couldn't load your courses.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const list = rows ?? [];
    if (!q) return list;
    return list.filter((row) => row.title.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q));
  }, [q, rows]);

  const deleteCourse = async (row: Row) => {
    const statusLabel =
      row.status === "published" ? "live" : row.status === "pending_review" ? "in review" : "draft";
    const ok = window.confirm(
      `Delete "${row.title}" permanently?\n\nThis ${statusLabel} course and its content will be removed. This cannot be undone.`,
    );
    if (!ok) return;
    setDeletingSlug(row.slug);
    setErr(null);
    try {
      const res = await fetch(`/api/studio/courses/${encodeURIComponent(row.slug)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        setErr(typeof data?.detail === "string" ? data.detail : "We couldn't delete that course.");
        return;
      }
      setRows((prev) => (prev ? prev.filter((item) => item.slug !== row.slug) : prev));
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <StudentSurface>
      <div className="space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-[#011B33]/50">Teach</p>
            <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">Course studio</h1>
            <p className="mt-2 text-sm text-[#011B33]/60">Create classroom modules or video courses, then publish.</p>
          </div>
          <Link
            href="/instructor/studio/new"
            className="inline-flex h-11 items-center gap-2 rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white hover:bg-[#0f4bb8]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New course
          </Link>
        </header>

        {err ? (
          <div className="rounded-[5px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-100" role="alert">
            {err}
          </div>
        ) : null}

        {q && rows ? (
          <p className="text-sm text-[#011B33]/55">
            {visible.length} {visible.length === 1 ? "match" : "matches"} for “{q}”
          </p>
        ) : null}

        {rows === null ? (
          <div className="grid animate-pulse gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-64 rounded-[5px] bg-brand-ink/10" />
            <div className="h-64 rounded-[5px] bg-brand-ink/10" />
            <div className="h-64 rounded-[5px] bg-brand-ink/10" />
          </div>
        ) : null}

        {rows && rows.length === 0 ? (
          <div className="rounded-[5px] border border-dashed border-brand-ink/20 px-6 py-16 text-center">
            <p className="text-lg font-extrabold">Build your first classroom</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#011B33]/60">Start a course, add a cover, then add modules and lessons students hear, say, and spell.</p>
            <Link
              href="/instructor/studio/new"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white hover:bg-[#0f4bb8]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create course
            </Link>
          </div>
        ) : null}

        {rows && rows.length > 0 && visible.length === 0 ? (
          <p className="rounded-[5px] border border-dashed border-brand-ink/20 px-4 py-10 text-center text-sm text-[#011B33]/55">
            No courses match that search.
          </p>
        ) : null}

        {visible.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((row) => {
              const img = resolveCourseImageUrl(row.image_url);
              const isAudio = row.format === "audio";
              const deleting = deletingSlug === row.slug;
              return (
                <li key={row.slug} className="flex flex-col overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white">
                  <Link href={`/instructor/studio/${row.slug}`} className="relative block aspect-video bg-[#f4f6fb]">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs font-semibold text-brand-ink/35">No cover</span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/instructor/studio/${row.slug}`} className="line-clamp-2 font-extrabold leading-snug hover:text-brand-accent">
                        {row.title}
                      </Link>
                      <StudioStatusPill status={row.status} />
                    </div>
                    <p className="mt-2 text-xs text-[#011B33]/50">
                      {isAudio ? "Classroom" : "Video"} · {row.lessons_count} lessons · {formatUpdated(row.updated_at)}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <StudioQuietLink href={`/instructor/studio/${row.slug}`}>Edit</StudioQuietLink>
                      <StudioQuietLink href={`/learn/${row.slug}?preview=1`}>
                        {row.status === "published" ? "Open" : "Preview"}
                      </StudioQuietLink>
                      <button
                        type="button"
                        disabled={deleting || deletingSlug !== null}
                        onClick={() => void deleteCourse(row)}
                        className="text-sm font-semibold text-red-700 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </StudentSurface>
  );
}
