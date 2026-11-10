export type StudentLook = "boy" | "girl";
export type TeacherVoice = "female" | "male";

const LOOK_KEY = "multivate.classroom.look";
const VOICE_KEY = "multivate.classroom.teacherVoice";

const BOY_FIRST =
  /^(usman|adewale|ibrahim|ahmed|ahmad|david|john|michael|chinedu|tunde|kunle|emeka|samuel|daniel|james|joseph|paul|peter|emmanuel|olumide|segun|femi|yusuf|mohammed|muhammad|ali|omar|kola|bayo|seun|tobi|chidi|obi|nnamdi|hassan|abdullahi)$/i;

export function guessLook(name?: string | null): StudentLook {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first) return "boy";
  if (BOY_FIRST.test(first)) return "boy";
  if (/(a|e|y|ine|ah)$/i.test(first)) return "girl";
  return "boy";
}

export function loadLook(name?: string | null): StudentLook {
  if (typeof window === "undefined") return guessLook(name);
  const stored = window.localStorage.getItem(LOOK_KEY);
  if (stored === "boy" || stored === "girl") return stored;
  return guessLook(name);
}

export function saveLook(look: StudentLook) {
  window.localStorage.setItem(LOOK_KEY, look);
}

export function loadTeacherVoice(): TeacherVoice {
  if (typeof window === "undefined") return "female";
  const stored = window.localStorage.getItem(VOICE_KEY);
  if (stored === "male" || stored === "female") return stored;
  return "female";
}

export function saveTeacherVoice(voice: TeacherVoice) {
  window.localStorage.setItem(VOICE_KEY, voice);
}

export function studentKid(look: StudentLook) {
  return look === "girl" ? "/classroom/girl.png" : "/classroom/boy.png";
}

export function partnerKid(look: StudentLook) {
  return look === "girl" ? "/classroom/boy.png" : "/classroom/girl.png";
}

export const CLASSROOM_SCENES = [
  { id: "cafe", label: "Café", src: "/classroom/scenes/cafe.jpg" },
  { id: "office", label: "Office", src: "/classroom/scenes/office.jpg" },
  { id: "campus", label: "Campus", src: "/classroom/scenes/campus.jpg" },
  { id: "street", label: "Street", src: "/classroom/scenes/street.jpg" },
] as const;

export type ClassroomScene = (typeof CLASSROOM_SCENES)[number]["id"];

export function sceneFor(text: string) {
  const t = text.toLowerCase();
  if (/anmeld|bürger|amt|visa|pass|wohnsitz|office/.test(t)) return "/classroom/scenes/office.jpg";
  if (/campus|uni|schule|klasse|studium|vorles/.test(t)) return "/classroom/scenes/campus.jpg";
  if (/arbeit|job|büro|kolleg/.test(t)) return "/classroom/scenes/office.jpg";
  if (/café|kaffee|cafe|restaurant|danke|bitte|hallo|guten|wie geht/.test(t)) {
    return "/classroom/scenes/cafe.jpg";
  }
  return "/classroom/scenes/street.jpg";
}

export function sceneSrc(key?: string | null, fallbackText = "") {
  const hit = CLASSROOM_SCENES.find((row) => row.id === key);
  if (hit) return hit.src;
  return sceneFor(fallbackText);
}

const DAYS_KEY = "multivate.classroom.practiceDays";

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function loadPracticeDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DAYS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((row) => typeof row === "string") : [];
  } catch {
    return [];
  }
}

export function markPracticeToday(): string[] {
  const today = todayKey();
  const days = loadPracticeDays();
  if (!days.includes(today)) {
    days.push(today);
    window.localStorage.setItem(DAYS_KEY, JSON.stringify(days));
  }
  return days;
}

export function streakCount(days: string[], from = new Date()): number {
  const set = new Set(days);
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (!set.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(todayKey(cursor))) return 0;
  }
  let count = 0;
  while (set.has(todayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function speakGerman(text: string, gender: TeacherVoice, lang = "de-DE") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.92;
  utter.pitch = gender === "female" ? 1.12 : 0.84;
  const voices = window.speechSynthesis.getVoices();
  const de = voices.filter((v) => /^de/i.test(v.lang));
  const female = /female|anna|petra|helena|katja|marlene|google deutsch/i;
  const male = /male|stefan|yannick|andreas|georg|markus/i;
  const pool = de.length ? de : voices;
  const match = pool.find((v) => (gender === "female" ? female.test(v.name) : male.test(v.name)));
  if (match) utter.voice = match;
  else if (de[0]) utter.voice = de[0];
  window.speechSynthesis.speak(utter);
}
