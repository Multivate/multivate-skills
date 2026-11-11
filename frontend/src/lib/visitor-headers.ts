const GEO_HEADER_NAMES = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country",
] as const;

export function visitorForwardHeaders(incoming: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of GEO_HEADER_NAMES) {
    const value = incoming.get(name);
    if (value) out[name] = value;
  }
  return out;
}
