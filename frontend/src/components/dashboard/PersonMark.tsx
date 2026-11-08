import type { CSSProperties } from "react";
import { avatarFontSize, personAvatarStyle } from "@/lib/person-avatar";

export function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PersonMark({ name, className = "h-9 w-9 text-xs" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} aria-hidden>
      <span
        className="inline-flex h-full w-full items-center justify-center rounded-full font-sans font-bold text-white"
        style={{ ...personAvatarStyle(name), color: "#FFFFFF", fontSize: avatarFontSize(className) }}
      >
        {personInitials(name)}
      </span>
    </span>
  );
}
