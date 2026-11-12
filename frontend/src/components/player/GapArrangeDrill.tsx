"use client";

import { useEffect, useMemo, useState } from "react";
import {
  arrangeBank,
  gappedDisplay,
  hideIndexes,
  hideLetterIndexes,
  letterBank,
  lettersOf,
  maskLetters,
  sameLetters,
  sameOrder,
  tileBank,
  tokenizeGerman,
} from "@/lib/gap-drill";

type Mode = "gap" | "arrange";

const EMPTY_EXTRA: string[] = [];

export function GapArrangeDrill({
  german,
  extra = EMPTY_EXTRA,
  mode,
  onSolved,
}: {
  german: string;
  extra?: string[];
  mode?: Mode;
  onSolved?: (ok: boolean) => void;
}) {
  const tokens = useMemo(() => tokenizeGerman(german), [german]);
  const hidden = useMemo(() => hideIndexes(tokens), [tokens]);
  const kind: Mode = mode ?? (tokens.length <= 4 ? "arrange" : "gap");
  const expected = kind === "gap" ? hidden.map((index) => tokens[index]!) : tokens;
  const initialBank = useMemo(
    () => (kind === "gap" ? tileBank(tokens, hidden, extra) : arrangeBank(tokens, extra)),
    [kind, tokens, hidden, extra],
  );
  const [bank, setBank] = useState(initialBank);
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setBank(initialBank);
    setPicked([]);
    setChecked(false);
    setOk(false);
  }, [german, kind, initialBank]);

  function take(tile: string, index: number) {
    if (checked) return;
    setBank((rows) => rows.filter((_, i) => i !== index));
    setPicked((rows) => [...rows, tile]);
  }

  function putBack(index: number) {
    if (checked) return;
    const tile = picked[index];
    if (!tile) return;
    setPicked((rows) => rows.filter((_, i) => i !== index));
    setBank((rows) => [...rows, tile]);
  }

  function check() {
    const pass = sameOrder(picked, expected);
    setOk(pass);
    setChecked(true);
    onSolved?.(pass);
  }

  return (
    <div>
      <p className="text-center text-lg font-extrabold leading-snug text-[#10244F] sm:text-xl">
        {kind === "gap" ? gappedDisplay(tokens, hidden) : "Tap the words in the right order."}
      </p>
      <p className="mt-1 text-center text-xs font-semibold text-[#10244F]/50">
        {kind === "gap" ? "Fill the gap. Leave the rest. This is not a full repeat of Listen." : "Build the German line from the tiles."}
      </p>
      <div className="mt-4 flex min-h-[3rem] flex-wrap justify-center gap-2 rounded-[14px] border border-dashed border-[#10244F]/20 bg-white px-3 py-3">
        {picked.length ? (
          picked.map((tile, index) => (
            <button
              key={`p-${tile}-${index}`}
              type="button"
              onClick={() => putBack(index)}
              className="rounded-lg bg-[#1457D0] px-3 py-2 text-sm font-bold text-white"
            >
              {tile}
            </button>
          ))
        ) : (
          <span className="text-sm text-[#10244F]/40">Tap tiles below</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {bank.map((tile, index) => (
          <button
            key={`b-${tile}-${index}`}
            type="button"
            disabled={checked}
            onClick={() => take(tile, index)}
            className="rounded-lg border border-[#10244F]/15 bg-[#f4f7fb] px-3 py-2 text-sm font-bold text-[#10244F] disabled:opacity-40"
          >
            {tile}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        {!checked ? (
          <button
            type="button"
            disabled={!picked.length}
            onClick={check}
            className="h-10 rounded-full bg-[#1457D0] px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Check
          </button>
        ) : (
          <p className={`text-sm font-extrabold ${ok ? "text-emerald-600" : "text-rose-500"}`}>
            {ok ? "Correct" : `Aim for: ${expected.join(" ")}`}
          </p>
        )}
      </div>
    </div>
  );
}

export function LetterSpellDrill({ german, english }: { german: string; english: string }) {
  const letters = useMemo(() => lettersOf(german), [german]);
  const arrangeAll = letters.length <= 10;
  const hidden = useMemo(() => (arrangeAll ? letters.map((_, index) => index) : hideLetterIndexes(letters)), [arrangeAll, letters]);
  const expected = hidden.map((index) => letters[index]!);
  const initialBank = useMemo(
    () => (arrangeAll ? arrangeBank(letters) : letterBank(letters, hidden)),
    [arrangeAll, letters, hidden],
  );
  const [bank, setBank] = useState(initialBank);
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setBank(initialBank);
    setPicked([]);
    setChecked(false);
    setOk(false);
  }, [german, initialBank]);

  function take(tile: string, index: number) {
    if (checked) return;
    setBank((rows) => rows.filter((_, i) => i !== index));
    setPicked((rows) => [...rows, tile]);
  }

  function putBack(index: number) {
    if (checked) return;
    const tile = picked[index];
    if (!tile) return;
    setPicked((rows) => rows.filter((_, i) => i !== index));
    setBank((rows) => [...rows, tile]);
  }

  function check() {
    const pass = sameLetters(picked, expected);
    setOk(pass);
    setChecked(true);
  }

  return (
    <div className="cr-surface-soft mt-4 rounded-[18px] px-3 py-5 sm:px-4 sm:py-6">
      <p className="text-center text-[11px] font-bold uppercase tracking-wider text-[#1457D0]">Spelling</p>
      <p className="mt-2 text-center text-sm font-semibold text-[#10244F]/70">German for “{english}”</p>
      <p className="mt-3 text-center font-mono text-2xl font-extrabold tracking-[0.18em] text-[#10244F]">
        {arrangeAll ? picked.join(" ") || "· · ·" : maskLetters(german, hidden)}
      </p>
      <p className="mt-2 text-center text-xs font-semibold text-[#10244F]/50">
        {arrangeAll ? "Tap the letters in order. Do not copy a spelled-out list." : "Fill the missing letters from the tiles."}
      </p>
      <div className="mt-4 flex min-h-[3rem] flex-wrap justify-center gap-2 rounded-[14px] border border-dashed border-[#10244F]/20 bg-white px-3 py-3">
        {picked.length ? (
          picked.map((tile, index) => (
            <button
              key={`p-${tile}-${index}`}
              type="button"
              onClick={() => putBack(index)}
              className="min-w-9 rounded-lg bg-[#1457D0] px-3 py-2 text-base font-bold text-white"
            >
              {tile}
            </button>
          ))
        ) : (
          <span className="text-sm text-[#10244F]/40">Tap letters below</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {bank.map((tile, index) => (
          <button
            key={`b-${tile}-${index}`}
            type="button"
            disabled={checked}
            onClick={() => take(tile, index)}
            className="min-w-9 rounded-lg border border-[#10244F]/15 bg-[#f4f7fb] px-3 py-2 text-base font-bold text-[#10244F] disabled:opacity-40"
          >
            {tile}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        {!checked ? (
          <button
            type="button"
            disabled={!picked.length}
            onClick={check}
            className="h-10 rounded-full bg-[#1457D0] px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Check
          </button>
        ) : (
          <p className={`text-sm font-extrabold ${ok ? "text-emerald-600" : "text-rose-500"}`}>
            {ok ? "Correct" : `Aim for: ${german}`}
          </p>
        )}
      </div>
    </div>
  );
}
