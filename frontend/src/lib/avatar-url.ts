/** Turn stored media paths into browser-usable URLs. */
export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.trim()) return null;
  const url = avatarUrl.trim();
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/v1/media/public/")) {
    return url.replace("/api/v1/media/public/", "/api/media/public/");
  }
  // Files are also served by Nginx at /uploads/* (same volume as API media/).
  if (url.startsWith("/uploads/")) return url;
  if (url.startsWith("/api/media/public/")) return url;
  if (url.startsWith("/")) return url;
  return `/uploads/${url.replace(/^\//, "")}`;
}
