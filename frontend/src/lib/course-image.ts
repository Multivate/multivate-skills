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
    // Course covers from studio are stored as /uploads/courses/...
    if (url.startsWith("/uploads/")) return url;
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    const mediaMarker = "/media/public/";
    const mediaIdx = parsed.pathname.indexOf(mediaMarker);
    if (mediaIdx >= 0) {
      return `/api/media/public/${parsed.pathname.slice(mediaIdx + mediaMarker.length)}`;
    }

    const uploadsMarker = "/uploads/";
    const uploadsIdx = parsed.pathname.indexOf(uploadsMarker);
    if (uploadsIdx >= 0) {
      return `/uploads/${parsed.pathname.slice(uploadsIdx + uploadsMarker.length)}`;
    }

    if (ALLOWED_HOSTS.has(parsed.hostname)) return url;
    if (/\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|$)/i.test(parsed.pathname)) return url;
  } catch {
    return null;
  }

  return null;
}
