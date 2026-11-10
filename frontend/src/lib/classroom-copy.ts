/** German letter names so the browser does not say "letter A". */
const DE_LETTER_SAY: Record<string, string> = {
  A: "Ah",
  B: "Be",
  C: "Tse",
  D: "De",
  E: "Eh",
  F: "Ef",
  G: "Ge",
  H: "Ha",
  I: "Ih",
  J: "Jot",
  K: "Ka",
  L: "El",
  M: "Em",
  N: "En",
  O: "Oh",
  P: "Pe",
  Q: "Ku",
  R: "Er",
  S: "Es",
  T: "Te",
  U: "Uh",
  V: "Fau",
  W: "We",
  X: "Iks",
  Y: "Ypsilon",
  Z: "Zett",
  Ä: "Äh",
  Ö: "Öh",
  Ü: "Üh",
  ß: "Eszett",
};

const DE_LETTER_HEAR: Record<string, string[]> = {
  a: ["a", "ah", "aa", "ay"],
  b: ["b", "be", "bay", "beh"],
  c: ["c", "tse", "tzeh", "ze", "ce"],
  d: ["d", "de", "day", "deh"],
  e: ["e", "eh", "ay", "ee"],
  f: ["f", "ef", "eff"],
  g: ["g", "ge", "gay", "geh"],
  h: ["h", "ha", "hah"],
  i: ["i", "ih", "ee", "ie"],
  j: ["j", "jot", "yot"],
  k: ["k", "ka", "kah"],
  l: ["l", "el", "ell"],
  m: ["m", "em", "emm"],
  n: ["n", "en", "enn"],
  o: ["o", "oh", "oo"],
  p: ["p", "pe", "peh", "pay"],
  q: ["q", "ku", "kuh", "koo"],
  r: ["r", "er", "air"],
  s: ["s", "es", "ess"],
  t: ["t", "te", "teh", "tay"],
  u: ["u", "uh", "oo"],
  v: ["v", "fau", "fow"],
  w: ["w", "we", "veh", "vay"],
  x: ["x", "iks", "ix"],
  y: ["y", "ypsilon", "upsilon"],
  z: ["z", "zett", "tset"],
  ä: ["ä", "ah", "ae"],
  ö: ["ö", "oh", "oe"],
  ü: ["ü", "uh", "ue"],
  ß: ["ß", "eszett", "ss"],
};

export function spokenGermanLine(text: string) {
  const key = text.trim();
  if (DE_LETTER_SAY[key]) return DE_LETTER_SAY[key];
  const upper = key.toUpperCase();
  if (key.length === 1 && DE_LETTER_SAY[upper]) return DE_LETTER_SAY[upper];
  return text;
}

export function isAlphabetLetter(text: string) {
  return /^[A-Za-zÄÖÜäöüß]$/u.test(text.trim());
}

export function phraseEnglish(source: string, target: string) {
  if (isAlphabetLetter(target) && /^(the\s+)?letter\s+/i.test(source.trim())) return target.trim();
  return source;
}

export function letterSpeechAliases(letter: string) {
  const key = letter.trim().toLowerCase();
  return DE_LETTER_HEAR[key] ?? [key];
}

const IPA: Record<string, string> = {
  hallo: "ˈha.lo",
  "guten tag": "ˈguː.tən taːk",
  danke: "ˈdaŋ.kə",
  "danke schön": "ˈdaŋ.kə ʃøːn",
  bitte: "ˈbɪ.tə",
  ja: "jaː",
  nein: "naɪn",
};

export function phraseIpa(target: string, stored?: string | null) {
  if (stored?.trim()) return stored.trim();
  const key = target.trim().toLowerCase().replace(/[!.?]/g, "");
  if (IPA[key]) return IPA[key];
  const letters = target.replace(/[^\p{L}]/gu, " ").trim();
  if (!letters) return "";
  return letters.toLowerCase().split(/\s+/).join(" · ");
}

export function phraseUsage(source: string, target: string, stored?: string | null) {
  if (isAlphabetLetter(target)) return "When you spell a name or a word.";
  if (stored?.trim()) return stored.trim();
  const line = `${source} ${target}`.toLowerCase();
  if (/(hallo|guten|hello|good day)/.test(line)) return "When you greet someone, any time of day.";
  if (/(danke|thank)/.test(line)) return "When someone helps you or gives you something.";
  if (/(name|heiße)/.test(line)) return "When you introduce yourself.";
  if (/(komme|from)/.test(line)) return "When someone asks where you are from.";
  if (/(bitte|please)/.test(line)) return "When you ask for something politely.";
  return "In everyday German at work, on campus, or in town.";
}

export function phraseTips(source: string, target: string) {
  if (isAlphabetLetter(target)) {
    return [`Say: ${target}`, `Use it when you spell a name or a word.`];
  }
  return [
    `Say: ${target}`,
    `Spell: ${target.replace(/[^\p{L}]/gu, "").split("").join("-").toUpperCase() || target}`,
    `Use it for: ${source.toLowerCase()}.`,
  ];
}

export function spellLetters(target: string) {
  return target
    .replace(/[^\p{L}]/gu, "")
    .split("")
    .join(" · ")
    .toUpperCase();
}
