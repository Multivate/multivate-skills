"use client";

import { Star } from "lucide-react";
import { useState } from "react";

type CourseOption = { slug: string; title: string };

export function CourseRatingPanel({
  courses,
  defaultSlug,
  collapsed = true,
  variant = "ghost",
}: {
  courses: CourseOption[];
  defaultSlug?: string;
  collapsed?: boolean;
  variant?: "ghost" | "card";
}) {
  const [slug, setSlug] = useState(defaultSlug || courses[0]?.slug || "");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (courses.length === 0) return null;

  async function save() {
    if (rating < 1) {
      setMsg("Pick a star rating first.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_slug: slug || courses[0]?.slug,
          rating,
          comment: comment.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(typeof data?.detail === "string" ? data.detail : "We couldn't save your review.");
        return;
      }
      setMsg("Saved. Thank you.");
      setComment("");
    } catch {
      setMsg("Connection problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <div className="space-y-3">
      {courses.length > 1 ? (
        <label className="block text-xs font-semibold text-[#011B33]/70">
          Course
          <select
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="mt-1 h-9 w-full rounded-[5px] border border-brand-ink/15 bg-white px-2 text-sm font-normal outline-none focus:border-brand-accent"
          >
            {courses.map((row) => (
              <option key={row.slug} value={row.slug}>
                {row.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs text-[#011B33]/55">{courses[0]?.title}</p>
      )}
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => {
          const on = (hover || rating) >= value;
          return (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(value)}
              onClick={() => setRating(value)}
              className="p-0.5"
            >
              <Star className={`h-5 w-5 ${on ? "text-[#c4710d]" : "text-[#d1d7dc]"}`} fill={on ? "currentColor" : "none"} />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={2}
        placeholder="Optional comment"
        className="w-full rounded-[5px] border border-brand-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand-accent"
      />
      {msg ? <p className="text-xs text-[#011B33]/70">{msg}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="h-9 rounded-[5px] bg-brand-accent px-3 text-xs font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Submit"}
      </button>
    </div>
  );

  if (!collapsed) return form;

  if (variant === "card") {
    return (
      <details className="rounded-[5px] border border-brand-ink/10 bg-[#f7f9fc] px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#011B33]/80">Leave a review</summary>
        <div className="mt-3">{form}</div>
      </details>
    );
  }

  return (
    <details id="reviews" className="group">
      <summary className="cursor-pointer list-none text-[11px] font-medium text-[#011B33]/40 transition hover:text-brand-accent [&::-webkit-details-marker]:hidden">
        Leave a review
      </summary>
      <div className="mt-3">{form}</div>
    </details>
  );
}
