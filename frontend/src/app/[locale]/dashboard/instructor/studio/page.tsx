"use client";

import { Link } from "@/i18n/navigation";
import { PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveCourseImageUrl } from "@/lib/course-image";

type Row = {
  slug: string;
  title: string;
  status: string;
  lessons_count: number;
  image_url: string;
  updated_at: string;
};

function statusLabel(s: string) {
  if (s === "published") return "Live";
  if (s === "pending_review") return "In review";
  return "Draft";
}

export default function InstructorStudioListPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-brand-ink sm:text-2xl">Course studio</h1>
          <p className="mt-1 text-sm text-slate-600">Build, organize, and submit courses for review.</p>
        </div>
        <Link href="/dashboard/instructor/studio/new" className="btn-primary-brand inline-flex !min-w-0 items-center gap-2 !py-2.5 text-sm">
          <PlusCircle className="h-4 w-4" />
          New course
        </Link>
      </div>

      {err ? <p className="text-sm text-red-800">{err}</p> : null}
      {rows === null ? <p className="text-sm text-slate-500">Loading…</p> : null}

      {rows && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-14 text-center">
          <p className="text-sm text-slate-600">You have not created a course yet.</p>
          <Link href="/dashboard/instructor/studio/new" className="btn-primary-brand mt-4 inline-flex !min-w-0 text-sm">
            Start your first course
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows?.map((row) => {
          const img = resolveCourseImageUrl(row.image_url);
          return (
            <div
              key={row.slug}
              className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:border-brand-primary/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <Link href={`/dashboard/instructor/studio/${row.slug}`} className="block">
                <div className="relative aspect-video bg-slate-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">No cover yet</div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    {statusLabel(row.status)}
                  </span>
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/dashboard/instructor/studio/${row.slug}`} className="font-bold text-brand-ink group-hover:text-brand-primary">
                  {row.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500">{row.lessons_count} lessons</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href={`/dashboard/instructor/studio/${row.slug}`} className="text-xs font-bold text-brand-primary hover:underline">
                    Edit
                  </Link>
                  <Link
                    href={row.status === "published" ? `/learn/${row.slug}` : `/learn/${row.slug}?preview=1`}
                    className="text-xs font-bold text-brand-accent hover:underline"
                  >
                    {row.status === "published" ? "Watch" : "Preview"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
