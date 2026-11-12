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
  const named = key.match(/^(?:the\s+)?letter\s+([A-Za-zÄÖÜäöüß])\b/i);
  const letter = named?.[1] ?? (key.length === 1 ? key : "");
  if (letter) {
    const say = DE_LETTER_SAY[letter] ?? DE_LETTER_SAY[letter.toUpperCase()];
    if (say) return say;
  }
  if (/^[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)+$/u.test(key)) return key.replace(/-/g, "");
  return key;
}

export function isAlphabetLetter(text: string) {
  return /^[A-Za-zÄÖÜäöüß]$/u.test(text.trim());
}

export function phraseEnglish(source: string, target: string) {
  const german = target.trim();
  if (isAlphabetLetter(german)) return german;
  if (/^(the\s+)?letter\s+/i.test(source.trim())) return german;
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
  const note = stored?.trim() ?? "";
  if (note && note.split(/\s+/).length >= 5) return note;
  const line = `${source} ${target}`.toLowerCase();
  if (/(hallo|guten|hello|good day)/.test(line)) return "When you greet someone, any time of day.";
  if (/(danke|thank)/.test(line)) return "When someone helps you or gives you something.";
  if (/(name|heiße)/.test(line)) return "When you introduce yourself.";
  if (/(komme|from)/.test(line)) return "When someone asks where you are from.";
  if (/(bitte|please)/.test(line)) return "When you ask for something politely.";
  return "In everyday German at work, on campus, or in town.";
}

export function usageSituations(source: string, target: string, stored?: string | null): string[] {
  const main = phraseUsage(source, target, stored);
  return [
    main,
    `Say it to a real person, not only while you look at the German line. Example: at a counter, on campus, or with a neighbour.`,
    `Do not paste the same listen line again. Use “${target}” when the English idea is: ${phraseEnglish(source, target)}.`,
  ];
}

export function usageDialogue(source: string, target: string): { them: string; you: string } {
  const english = phraseEnglish(source, target);
  return {
    them: `In this situation someone needs the idea “${english}”. They look at you and wait.`,
    you: target,
  };
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
