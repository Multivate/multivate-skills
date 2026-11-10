"use client";

import { CheckCircle2, XCircle } from "lucide-react";

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
  tone = "default",
}: {
  expect: string;
  heard: string;
  recording: boolean;
  error?: string | null;
  clipUrl?: string | null;
  missHint?: string;
  tone?: "default" | "onDark";
}) {
  const match = Boolean(heard.trim()) && !recording && speechMatches(expect, heard);
  const miss = Boolean(heard.trim()) && !recording && !match;
  const okClass = tone === "onDark" ? "text-emerald-200" : "text-emerald-600";
  const badClass = tone === "onDark" ? "text-rose-200" : "text-rose-500";
  return (
    <div className="mt-2 text-sm">
      {match ? (
        <p className={`mt-1 inline-flex items-center gap-2 text-base font-extrabold ${okClass}`} role="status">
          <CheckCircle2 className="h-8 w-8 shrink-0" aria-hidden />
          Correct
        </p>
      ) : null}
      {miss ? (
        <p className={`mt-1 inline-flex items-center gap-2 text-base font-extrabold ${badClass}`} role="status">
          <XCircle className="h-8 w-8 shrink-0" aria-hidden />
          Incorrect
        </p>
      ) : null}
      <p className={tone === "onDark" ? "mt-1 text-white/80" : "cr-muted"}>
        {heard || (recording ? "Listening…" : "Allow the microphone when asked.")}
      </p>
      {error ? <p className={`mt-1 ${badClass}`}>{error}</p> : null}
      {miss ? <p className={`mt-1 font-semibold ${badClass}`}>{missHint ?? `Aim for: ${expect}`}</p> : null}
      {clipUrl ? <audio className="mt-2 max-w-full" controls src={clipUrl} /> : null}
    </div>
  );
}
