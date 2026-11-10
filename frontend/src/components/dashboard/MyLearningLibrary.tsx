"use client";

import { Heart } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CourseThumbnail } from "@/components/courses/CourseThumbnail";
import { Link } from "@/i18n/navigation";
import { useWishlist, type WishlistCourse } from "@/contexts/wishlist-context";
import type { BackendCourse } from "@/lib/backend-courses";

type LearningList = {
  id: string;
  title: string;
  courses: WishlistCourse[];
};

function LibraryCard({ course, action }: { course: WishlistCourse; action?: ReactNode }) {
  return (
    <article className="flex flex-col">
      <Link href={`/courses/${course.slug}`} className="group">
        <div className="relative aspect-video w-full overflow-hidden bg-[#f7f9fa]">
          <CourseThumbnail src={course.image_url} alt={course.title} sizes="260px" className="object-cover" />
        </div>
        <h3 className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug group-hover:text-[#1457D0]">{course.title}</h3>
        {course.instructor_name ? <p className="mt-1 truncate text-xs text-[#6a6f73]">{course.instructor_name}</p> : null}
      </Link>
      {action}
    </article>
  );
}

export function WishlistPanel() {
  const { items, toggle } = useWishlist();

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <Heart className="mx-auto h-8 w-8 text-[#d1d7dc] dark:text-[#eef4ff]/35" />
        <p className="mt-4 text-lg font-bold">Your wishlist is empty.</p>
        <p className="mt-2 text-sm text-[#6a6f73]">
          Save courses you want later. They stay on this account, not just this browser.{" "}
          <Link href="/courses" className="font-bold text-[#1457D0] hover:underline">
            Explore courses.
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((course) => (
        <LibraryCard
          key={course.slug}
          course={course}
          action={
            <button type="button" onClick={() => void toggle(course.slug)} className="mt-2 text-left text-xs font-bold text-[#1457D0]">
              Remove
            </button>
          }
        />
      ))}
    </div>
  );
}

export function MyListsPanel() {
  const [lists, setLists] = useState<LearningList[] | null>(null);
  const [catalog, setCatalog] = useState<BackendCourse[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [listRes, catalogRes] = await Promise.all([
      fetch("/api/learning/lists", { credentials: "include", cache: "no-store" }),
      fetch("/api/courses", { cache: "no-store" }),
    ]);
    const listData = await listRes.json().catch(() => null);
    const catalogData = await catalogRes.json().catch(() => null);
    if (!listRes.ok) {
      setError(typeof listData?.detail === "string" ? listData.detail : "We couldn't load your lists.");
      setLists([]);
      return;
    }
    setError(null);
    setLists(Array.isArray(listData) ? (listData as LearningList[]) : []);
    setCatalog(catalogRes.ok && Array.isArray(catalogData) ? (catalogData as BackendCourse[]) : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createList() {
    const next = title.trim();
    if (!next) return;
    setBusy(true);
    try {
      const res = await fetch("/api/learning/lists", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (res.ok) {
        setTitle("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function addCourse(listId: string, slug: string) {
    if (!slug) return;
    await fetch(`/api/learning/lists/${encodeURIComponent(listId)}/courses`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_slug: slug }),
    });
    await load();
  }

  async function removeCourse(listId: string, slug: string) {
    await fetch(`/api/learning/lists/${encodeURIComponent(listId)}/courses/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  }

  async function removeList(listId: string) {
    await fetch(`/api/learning/lists/${encodeURIComponent(listId)}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  if (lists === null) {
    return <p className="text-sm text-[#6a6f73]">Loading your lists…</p>;
  }

  return (
    <div className="space-y-8">
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void createList();
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Name a list, e.g. Interview German"
          className="h-11 min-w-[16rem] flex-1 rounded border border-[#1c1d1f] px-4 text-sm outline-none focus:border-[#1457D0]"
        />
        <button type="submit" disabled={busy || !title.trim()} className="h-11 bg-[#1457D0] px-4 text-sm font-bold text-white disabled:opacity-50">
          Create list
        </button>
      </form>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {lists.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-lg font-bold">No lists yet.</p>
          <p className="mt-2 text-sm text-[#6a6f73]">Group courses by goal (interviews, tech, or a 30-day sprint) instead of one mixed cart.</p>
        </div>
      ) : (
        lists.map((list) => (
          <section key={list.id} className="rounded border border-[#d1d7dc] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{list.title}</h2>
                <p className="text-xs text-[#6a6f73]">{list.courses.length} course{list.courses.length === 1 ? "" : "s"}</p>
              </div>
              <button type="button" onClick={() => void removeList(list.id)} className="text-sm font-bold text-[#1457D0]">
                Delete list
              </button>
            </div>
            <label className="mt-4 block text-sm font-bold">
              Add a published course
              <select
                defaultValue=""
                onChange={(event) => {
                  void addCourse(list.id, event.target.value);
                  event.currentTarget.value = "";
                }}
                className="mt-1 h-11 w-full max-w-md border border-[#1c1d1f] px-3 text-sm font-normal"
              >
                <option value="">Choose a course</option>
                {catalog
                  .filter((course) => !list.courses.some((row) => row.slug === course.slug))
                  .map((course) => (
                    <option key={course.slug} value={course.slug}>
                      {course.title}
                    </option>
                  ))}
              </select>
            </label>
            {list.courses.length === 0 ? (
              <p className="mt-4 text-sm text-[#6a6f73]">This list is empty.</p>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.courses.map((course) => (
                  <LibraryCard
                    key={course.slug}
                    course={course}
                    action={
                      <button type="button" onClick={() => void removeCourse(list.id, course.slug)} className="mt-2 text-left text-xs font-bold text-[#1457D0]">
                        Remove
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
