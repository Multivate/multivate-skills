export function nextWeekTitle(existingTitles: string[]): string {
  const used = new Set(
    existingTitles
      .map((t) => {
        const m = t.trim().match(/^week\s+(\d+)$/i);
        return m ? Number(m[1]) : 0;
      })
      .filter((n) => n > 0),
  );
  let n = existingTitles.length + 1;
  while (used.has(n)) n += 1;
  return `Week ${n}`;
}

export function currentWeekStorageKey(slug: string) {
  return `multivate:studio-week:${slug}`;
}

export function doneWeeksStorageKey(slug: string) {
  return `multivate:studio-done-weeks:${slug}`;
}

export function readStoredWeekId(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(currentWeekStorageKey(slug));
  } catch {
    return null;
  }
}

export function writeStoredWeekId(slug: string, id: string) {
  try {
    window.localStorage.setItem(currentWeekStorageKey(slug), id);
  } catch {
    /* ignore */
  }
}

export function readDoneWeekIds(slug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(doneWeeksStorageKey(slug));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function writeDoneWeekIds(slug: string, ids: string[]) {
  try {
    window.localStorage.setItem(doneWeeksStorageKey(slug), JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
