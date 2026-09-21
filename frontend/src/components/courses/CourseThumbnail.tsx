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
  /** Show the full image without cropping (natural height). */
  fit?: "cover" | "contain";
};

function ThumbnailPlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full min-h-[10rem] w-full items-center justify-center bg-brand-muted">
      <div
        className={`flex items-center justify-center rounded-md border border-brand-accent/25 bg-brand-surface shadow-sm ${
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

function preferNativeImageTag(resolved: string): boolean {
  if (resolved.startsWith("/api/media/public/")) return true;
  if (resolved.startsWith("/uploads/")) return true;
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
  fit = "cover",
}: Props) {
  const resolved = resolveCourseImageUrl(src);
  const [failed, setFailed] = useState(false);
  const nativeImg = resolved ? preferNativeImageTag(resolved) : false;
  const contain = fit === "contain";

  if (!resolved || failed) {
    return <ThumbnailPlaceholder compact={compact} />;
  }

  if (contain) {
    const containClass = `h-auto w-full object-contain ${className}`;
    if (nativeImg) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          className={containClass}
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
        width={1200}
        height={900}
        className={containClass}
        sizes={sizes}
        onError={() => setFailed(true)}
      />
    );
  }

  const imgClass = `absolute inset-0 h-full w-full ${className}`;

  if (nativeImg) {
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
