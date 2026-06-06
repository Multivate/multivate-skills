"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { resolveCourseImageUrl } from "@/lib/course-image";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  /** Smaller placeholder icon for compact cards (e.g. landing carousel). */
  compact?: boolean;
};

function ThumbnailPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
      <div
        className={`flex items-center justify-center rounded-xl border border-brand-accent/25 bg-white shadow-sm dark:border-brand-accent/30 dark:bg-slate-900 ${
          compact ? "h-9 w-9" : "h-11 w-11"
        }`}
      >
        <BookOpen
          className={`text-brand-accent ${compact ? "h-4 w-4" : "h-5 w-5"}`}
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function CourseThumbnail({
  src,
  alt,
  className = "object-cover",
  sizes = "80px",
  compact = false,
}: Props) {
  const resolved = resolveCourseImageUrl(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return <ThumbnailPlaceholder compact={compact} />;
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
