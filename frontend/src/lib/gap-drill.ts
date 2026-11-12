const SMALL = new Set([
  "der",
  "die",
  "das",
  "ein",
  "eine",
  "einen",
  "einem",
  "und",
  "oder",
  "ich",
  "du",
  "er",
  "sie",
  "es",
  "wir",
  "ihr",
  "in",
  "im",
  "am",
  "an",
  "auf",
  "zu",
  "zum",
  "zur",
]);

const DISTRACTORS = ["bitte", "heute", "gern", "auch", "noch", "hier", "nicht", "sehr", "gut", "morgen"];

export function tokenizeGerman(line: string): string[] {
  return line
    .replace(/[„“«»"']/g, "")
    .split(/\s+/)
    .map((token) => token.replace(/^[(\[{]+/, "").replace(/[)\]}.,!?;:]+$/g, ""))
    .filter(Boolean);
}

export function normalizeGap(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function hideIndexes(tokens: string[], random = Math.random): number[] {
  if (!tokens.length) return [];
  if (tokens.length === 1) return [0];
  const content = tokens
    .map((token, index) => ({ token, index }))
    .filter((row) => row.token.length > 2 && !SMALL.has(row.token.toLowerCase()));
  const pool = content.length ? content : tokens.map((token, index) => ({ token, index }));
  const first = pool[Math.floor(random() * pool.length)]!;
  const extra =
    pool.length > 2 && tokens.length > 4 ? pool.filter((row) => row.index !== first.index)[Math.floor(random() * Math.max(1, pool.length - 1))] : null;
  const indexes = extra ? [first.index, extra.index] : [first.index];
  return [...new Set(indexes)].sort((a, b) => a - b);
}

export function gappedDisplay(tokens: string[], hidden: number[]): string {
  return tokens.map((token, index) => (hidden.includes(index) ? "____" : token)).join(" ");
}

export function tileBank(tokens: string[], hidden: number[], extra: string[] = [], random = Math.random): string[] {
  const needed = hidden.map((index) => tokens[index]!).filter(Boolean);
  const noise = shuffle(
    [...extra, ...DISTRACTORS].filter((row) => !needed.some((need) => normalizeGap(need) === normalizeGap(row))),
    random,
  ).slice(0, Math.min(3, Math.max(1, 4 - needed.length)));
  return shuffle([...needed, ...noise], random);
}

export function arrangeBank(tokens: string[], extra: string[] = [], random = Math.random): string[] {
  const noise = shuffle(
    extra.filter((row) => !tokens.some((token) => normalizeGap(token) === normalizeGap(row))),
    random,
  ).slice(0, tokens.length > 6 ? 0 : 2);
  return shuffle([...tokens, ...noise], random);
}

export function sameOrder(picked: string[], expected: string[]): boolean {
  return normalizeGap(picked.join(" ")) === normalizeGap(expected.join(" "));
}
