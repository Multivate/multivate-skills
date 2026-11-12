export const LADDER_PRICE_NAIRA: Record<string, number> = {
  "german-a1-zero-to-beginner": 55_000,
  "german-a1-advanced": 60_000,
  "german-a2-beginner": 65_000,
  "german-a2-advanced": 70_000,
  "german-b1-beginner": 80_000,
  "german-b1-advanced": 85_000,
  "german-b2-beginner": 95_000,
  "german-b2-advanced": 100_000,
  "german-c1-beginner": 110_000,
  "german-c1-advanced": 120_000,
  "german-c2-beginner": 135_000,
  "german-c2-advanced": 150_000,
};

const LADDER_CEFR: Record<string, string> = {
  "german-a1-zero-to-beginner": "A1",
  "german-a1-advanced": "A1",
  "german-a2-beginner": "A2",
  "german-a2-advanced": "A2",
  "german-b1-beginner": "B1",
  "german-b1-advanced": "B1",
  "german-b2-beginner": "B2",
  "german-b2-advanced": "B2",
  "german-c1-beginner": "C1",
  "german-c1-advanced": "C1",
  "german-c2-beginner": "C2",
  "german-c2-advanced": "C2",
};

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

function slugsThrough(end: string): string[] {
  const allowed = new Set(CEFR_ORDER.slice(0, CEFR_ORDER.indexOf(end) + 1));
  return Object.keys(LADDER_CEFR).filter((slug) => allowed.has(LADDER_CEFR[slug] ?? ""));
}

export type GermanPackage = {
  id: string;
  title: string;
  range: string;
  percent: number;
  slugs: string[];
  image: string;
};

export type BundleQuote = {
  percent: number;
  label: string;
  count: number;
  listCents: number;
  payableCents: number;
  saveCents: number;
};

export const GERMAN_PACKAGES: GermanPackage[] = [
  {
    id: "german-a1-a2-package",
    title: "German A1-A2",
    range: "A1 to A2",
    percent: 10,
    slugs: slugsThrough("A2"),
    image: "/marketing/german-a1-a2-package-cover.jpg",
  },
  {
    id: "german-a1-b1-package",
    title: "German A1-B1",
    range: "A1 to B1",
    percent: 12,
    slugs: slugsThrough("B1"),
    image: "/marketing/german-a1-b1-package-cover.jpg",
  },
  {
    id: "german-a1-b2-package",
    title: "German A1-B2",
    range: "A1 to B2",
    percent: 15,
    slugs: slugsThrough("B2"),
    image: "/marketing/german-a1-b2-package-cover.jpg",
  },
  {
    id: "german-a1-c1-package",
    title: "German A1-C1",
    range: "A1 to C1",
    percent: 18,
    slugs: slugsThrough("C1"),
    image: "/marketing/german-a1-c1-package-cover.jpg",
  },
  {
    id: "german-a1-c2-package",
    title: "German A1-C2",
    range: "A1 to C2",
    percent: 20,
    slugs: slugsThrough("C2"),
    image: "/marketing/german-a1-c2-package-cover.jpg",
  },
];

export function packageQuote(
  pkg: GermanPackage,
  catalog: { slug: string; price_cents?: number | null }[] = [],
): BundleQuote {
  const lineCents = pkg.slugs.map((slug) => {
    const live = catalog.find((row) => row.slug === slug)?.price_cents;
    if (typeof live === "number" && live > 0) return live;
    return (LADDER_PRICE_NAIRA[slug] ?? 0) * 100;
  });
  const listCents = lineCents.reduce((sum, n) => sum + n, 0);
  const payableCents = Math.max(0, Math.round((listCents * (100 - pkg.percent)) / 100));
  return {
    percent: pkg.percent,
    label: pkg.range,
    count: pkg.slugs.length,
    listCents,
    payableCents,
    saveCents: Math.max(0, listCents - payableCents),
  };
}

const PATHS: { needed: string[]; percent: number; label: string }[] = [
  { needed: ["A1", "A2", "B1", "B2", "C1", "C2"], percent: 20, label: "A1 to C2" },
  { needed: ["A1", "A2", "B1", "B2", "C1"], percent: 18, label: "A1 to C1" },
  { needed: ["A1", "A2", "B1", "B2"], percent: 15, label: "A1 to B2" },
  { needed: ["A1", "A2", "B1"], percent: 12, label: "A1 to B1" },
  { needed: ["A1", "A2"], percent: 10, label: "A1 to A2" },
];

export function isHiddenPublicCourse(title: string, slug: string): boolean {
  const blob = `${title} ${slug}`.toLowerCase();
  return blob.includes("1:1") || blob.includes("1-1");
}

export function sortCatalogCourses<T extends { slug: string; title: string }>(courses: T[]): T[] {
  const order = Object.keys(LADDER_CEFR);
  return [...courses].sort((a, b) => {
    const ai = order.indexOf(a.slug);
    const bi = order.indexOf(b.slug);
    const ak = ai === -1 ? 1000 : ai;
    const bk = bi === -1 ? 1000 : bi;
    if (ak !== bk) return ak - bk;
    return a.title.localeCompare(b.title);
  });
}

export type CatalogMixItem<T> =
  | { kind: "course"; course: T }
  | { kind: "package"; pkg: GermanPackage };

export function mixCatalogWithPackages<T extends { slug: string }>(
  courses: T[],
  packages: GermanPackage[] = GERMAN_PACKAGES,
): CatalogMixItem<T>[] {
  const leftover = new Set(packages);
  const byLastSlug = new Map(packages.map((pkg) => [pkg.slugs[pkg.slugs.length - 1] ?? "", pkg]));
  const mixed: CatalogMixItem<T>[] = [];
  for (const course of courses) {
    mixed.push({ kind: "course", course });
    const pkg = byLastSlug.get(course.slug);
    if (pkg && leftover.has(pkg)) {
      leftover.delete(pkg);
      mixed.push({ kind: "package", pkg });
    }
  }
  for (const pkg of leftover) mixed.push({ kind: "package", pkg });
  return mixed;
}

export function bundleQuote(slugs: string[], lineCents: number[]): BundleQuote {
  const seen: string[] = [];
  slugs.forEach((slug) => {
    const key = slug.trim();
    if (key && !seen.includes(key)) seen.push(key);
  });
  const listCents = lineCents.reduce((sum, n) => sum + Math.max(0, n), 0);
  if (seen.length < 2) {
    return { percent: 0, label: "", count: seen.length, listCents, payableCents: listCents, saveCents: 0 };
  }
  const cefrs = new Set(seen.map((slug) => LADDER_CEFR[slug]).filter(Boolean));
  let percent = 10;
  let label = "2 or more courses";
  for (const path of PATHS) {
    if (path.needed.every((level) => cefrs.has(level))) {
      percent = path.percent;
      label = path.label;
      break;
    }
  }
  const payableCents = Math.max(0, Math.round((listCents * (100 - percent)) / 100));
  return {
    percent,
    label,
    count: seen.length,
    listCents,
    payableCents,
    saveCents: Math.max(0, listCents - payableCents),
  };
}
