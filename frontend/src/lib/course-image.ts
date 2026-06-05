/** Resolve course `image_url` values (including YouTube links) for next/image. */

const ALLOWED_HOSTS = new Set(["images.unsplash.com", "img.youtube.com"]);

function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) return embed[1];
    }
  } catch {
    return null;
  }
  return null;
}

/** Returns a URL safe for next/image, or null to show a placeholder. */
export function resolveCourseImageUrl(raw: string | null | undefined): string | null {
  const url = (raw ?? "").trim();
  if (!url) return null;

  const ytId = youtubeVideoId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

  if (url.startsWith("/")) {
    if (url.startsWith("/api/v1/media/public/")) {
      return url.replace("/api/v1/media/public/", "/api/media/public/");
    }
    if (url.startsWith("/api/media/public/")) return url;
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (ALLOWED_HOSTS.has(parsed.hostname)) return url;
    if (/\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|$)/i.test(parsed.pathname)) return url;
  } catch {
    return null;
  }

  return null;
}
