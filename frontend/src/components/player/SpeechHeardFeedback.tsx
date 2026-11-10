"use client";

export function speechMatches(expect: string, heard: string) {
  const a = expect
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const b = heard
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.includes(a) || a.includes(b)) return true;
  const words = a.split(" ");
  const heardWords = new Set(b.split(" "));
  return words.length > 0 && words.every((word) => heardWords.has(word));
}

export function SpeechHeardFeedback({
  expect,
  heard,
  recording,
  error,
  clipUrl,
  missHint,
}: {
  expect: string;
  heard: string;
  recording: boolean;
  error?: string | null;
  clipUrl?: string | null;
  missHint?: string;
}) {
  const match = Boolean(heard.trim()) && !recording && speechMatches(expect, heard);
  const miss = Boolean(heard.trim()) && !recording && !match;
  return (
    <div className="mt-2 text-sm">
      <p className="cr-muted">{heard || (recording ? "Listening…" : "Allow the microphone when asked.")}</p>
      {error ? <p className="mt-1 text-rose-500">{error}</p> : null}
      {match ? <p className="mt-1 font-semibold text-emerald-600">That matches the German line.</p> : null}
      {miss ? (
        <p className="mt-1 font-semibold text-rose-500">{missHint ?? `Heard a different line. Aim for: ${expect}`}</p>
      ) : null}
      {clipUrl ? <audio className="mt-2 max-w-full" controls src={clipUrl} /> : null}
    </div>
  );
}
