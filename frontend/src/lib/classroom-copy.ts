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
