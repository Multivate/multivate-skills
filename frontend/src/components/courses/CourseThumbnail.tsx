"use client";

import { BookOpen } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { resolveCourseImageUrl } from "@/lib/course-image";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  compact?: boolean;
};

function ThumbnailPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-800">
      <div
        className={`flex items-center justify-center rounded-xl border border-brand-accent/25 bg-white shadow-sm dark:border-brand-accent/30 dark:bg-slate-900 ${
          compact ? "h-10 w-10" : "h-12 w-12"
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

/** Use native img for proxied uploads and most HTTPS URLs — more reliable than next/image for API routes. */
function useNativeImageTag(resolved: string): boolean {
  if (resolved.startsWith("/api/media/public/")) return true;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    try {
      const host = new URL(resolved).hostname;
      if (host === "images.unsplash.com" || host === "img.youtube.com") return false;
    } catch {
      return true;
    }
    return true;
  }
  return false;
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

  const imgClass = `absolute inset-0 h-full w-full ${className}`;

  if (useNativeImageTag(resolved)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={alt}
        className={imgClass}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
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
