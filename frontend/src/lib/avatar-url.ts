export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.trim()) return null;
  const url = avatarUrl.trim();
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return url.replace("/api/v1/media/public/", "/api/media/public/");
}
