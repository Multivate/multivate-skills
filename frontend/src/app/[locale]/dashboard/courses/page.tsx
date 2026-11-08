"use client";

import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { DashboardSavedCart } from "@/components/dashboard/DashboardSavedCart";
import { LearningToolsPanel } from "@/components/dashboard/LearningToolsPanel";
import { MyListsPanel, WishlistPanel } from "@/components/dashboard/MyLearningLibrary";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type MyCourseItem = {
  slug: string;
  title: string;
  description: string;
  image_url: string;
  image_alt: string;
  lessons: number;
  lesson_done: number;
  progress_pct: number;
  status: string;
  instructor_name?: string | null;
};

type Tab = "courses" | "lists" | "wishlist" | "saved" | "tools";

export default function DashboardCoursesPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-[#6a6f73]">Loading your courses…</p>}>
      <DashboardCoursesInner />
    </Suspense>
  );
}

function DashboardCoursesInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("courses");
  const [items, setItems] = useState<MyCourseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const next = searchParams.get("tab");
    if (next === "saved" || next === "lists" || next === "wishlist" || next === "tools" || next === "courses") setTab(next);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          setError("Your session expired. Please sign in again.");
          setItems([]);
          return;
        }
        if (!res.ok) {
          setError(typeof data?.detail === "string" ? data.detail : "We couldn't load your courses.");
          setItems([]);
          return;
        }
        setError(null);
        setItems(Array.isArray(data) ? (data as MyCourseItem[]) : []);
      } catch {
        if (!cancelled) {
          setError("We could not reach the server. Check your connection and try again.");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!items) return [];
    if (!needle) return items;
    return items.filter((row) => row.title.toLowerCase().includes(needle) || (row.instructor_name ?? "").toLowerCase().includes(needle));
  }, [items, query]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "courses", label: "All courses" },
    { id: "lists", label: "My lists" },
    { id: "wishlist", label: "Wishlist" },
    { id: "saved", label: "Saved" },
    { id: "tools", label: "Learning tools" },
  ];

  return (
    <div className="bg-white">
      <div className="border-b-4 border-brand-accent bg-[#10244F] text-white">
        <div className="mx-auto max-w-[84rem] px-4 py-10 sm:px-6">
          <h1 className="text-[2rem] font-extrabold tracking-tight sm:text-[2.5rem]">My learning</h1>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="My learning">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-[5px] px-3.5 py-2 text-sm font-semibold transition duration-200 ${
                  tab === item.id ? "bg-white text-[#10244F]" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[84rem] px-4 py-8 sm:px-6">
        {error ? (
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <Link href="/login" className="mt-3 inline-block text-sm font-bold text-[#1457D0]">
              Go to sign in
            </Link>
          </div>
        ) : null}

        {tab === "saved" ? <DashboardSavedCart /> : null}
        {tab === "wishlist" ? <WishlistPanel /> : null}
        {tab === "lists" ? <MyListsPanel /> : null}
        {tab === "tools" ? <LearningToolsPanel /> : null}

        {tab === "courses" ? (
          items === null ? (
            <p className="text-sm text-[#6a6f73]">Loading your courses…</p>
          ) : (
            <div className="space-y-6">
              {items.length > 0 ? (
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search my courses"
                  className="h-11 w-full max-w-sm rounded-[5px] border border-brand-ink/15 px-4 text-sm outline-none focus:border-brand-accent"
                />
              ) : null}
              {items.length === 0 ? (
                <EmptyLearning />
              ) : filtered.length === 0 ? (
                <p className="text-sm text-[#6a6f73]">No courses match that search.</p>
              ) : (
                <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((row) => {
                    const started = row.progress_pct > 0 || row.lesson_done > 0;
                    return (
                      <Link key={row.slug} href={`/learn/${row.slug}`} className="group flex flex-col">
                        <div className="relative aspect-video w-full overflow-hidden rounded-[5px] bg-[#f7f9fa]">
                          <CourseThumbnail src={row.image_url} alt={row.image_alt} sizes="260px" className="object-cover" />
                        </div>
                        <h2 className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-[#011B33] group-hover:text-brand-accent">
                          {row.title}
                        </h2>
                        {row.instructor_name ? <p className="mt-1 truncate text-xs text-[#011B33]/55">{row.instructor_name}</p> : null}
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-brand-ink/10">
                          <div className="h-full bg-brand-accent" style={{ width: `${Math.min(100, Math.max(0, row.progress_pct))}%` }} />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-brand-accent">
                          {started ? `${row.progress_pct}% complete` : "Start course"}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function EmptyLearning() {
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-bold text-[#1c1d1f]">Start learning today.</p>
      <p className="mt-2 text-sm text-[#6a6f73]">
        When you enroll in a course, it will appear here.{" "}
        <Link href="/courses" className="font-bold text-[#1457D0] underline-offset-2 hover:underline">
          Browse now.
        </Link>
      </p>
    </div>
  );
}
