"use client";

import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  StudioPageHeader,
  StudioQuietLink,
  StudioStatusPill,
} from "@/components/studio/studio-ui";
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
      setRows((prev) => (prev ? prev.filter((r) => r.slug !== row.slug) : prev));
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <div className="mx-auto max-w-[90rem] space-y-10">
      <StudioPageHeader
        eyebrow="Instructor"
        title="Course studio"
        description="Create and publish courses."
        action={
          <Link
            href="/dashboard/instructor/studio/new"
            className="btn-cta-accent inline-flex !min-h-0 items-center gap-2 !px-5 !py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New course
          </Link>
        }
      />

      {err ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {err}
        </div>
      ) : null}

      {rows === null ? (
        <p className="text-sm text-brand-ink/50">Loading your courses…</p>
      ) : null}

      {rows && rows.length === 0 ? (
        <div className="border border-brand-ink/10 bg-brand-surface px-6 py-16 text-center sm:px-10">
          <p className="tag-overline">Empty studio</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tighter text-brand-ink sm:text-3xl">
            Build your first course
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-brand-ink/60">
            Start a course, add a cover, then fill in the lessons.
          </p>
          <Link
            href="/dashboard/instructor/studio/new"
            className="btn-cta-accent mt-8 inline-flex !min-h-0 items-center gap-2 !px-5 !py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create course
          </Link>
        </div>
      ) : null}

      {rows && rows.length > 0 ? (
        <div className="border border-brand-ink/10 bg-brand-surface">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_7rem_6rem_6rem_8rem_10rem] gap-4 border-b border-brand-ink/10 px-5 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45 sm:grid sm:px-6">
            <span>Course</span>
            <span>Status</span>
            <span>Format</span>
            <span>Items</span>
            <span>Updated</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-brand-ink/10">
            {rows.map((row) => {
              const img = resolveCourseImageUrl(row.image_url);
              const isAudio = row.format === "audio";
              const deleting = deletingSlug === row.slug;
              return (
                <li
                  key={row.slug}
                  className="grid grid-cols-1 gap-4 px-5 py-4 transition hover:bg-brand-muted/40 sm:grid-cols-[minmax(0,1.4fr)_7rem_6rem_6rem_8rem_10rem] sm:items-center sm:gap-4 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <Link
                      href={`/dashboard/instructor/studio/${row.slug}`}
                      className="relative h-14 w-20 shrink-0 overflow-hidden bg-brand-muted"
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-brand-ink/35">
                          No cover
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/instructor/studio/${row.slug}`}
                        className="block truncate font-display text-base font-semibold text-brand-ink hover:text-brand-accent"
                      >
                        {row.title}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-brand-ink/45">{row.slug}</p>
                    </div>
                  </div>
                  <div>
                    <StudioStatusPill status={row.status} />
                  </div>
                  <p className="text-sm capitalize text-brand-ink/70">{isAudio ? "Audio" : "Video"}</p>
                  <p className="text-sm tabular-nums text-brand-ink/70">
                    {row.lessons_count} {isAudio ? "phrases" : "lessons"}
                  </p>
                  <p className="text-sm text-brand-ink/55">{formatUpdated(row.updated_at)}</p>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <StudioQuietLink href={`/dashboard/instructor/studio/${row.slug}`}>Edit</StudioQuietLink>
                    <StudioQuietLink
                      href={`/learn/${row.slug}?preview=1`}
                    >
                      {row.status === "published" ? "Open" : "Preview"}
                    </StudioQuietLink>
                    <button
                      type="button"
                      disabled={deleting || deletingSlug !== null}
                      onClick={() => void deleteCourse(row)}
                      className="text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
