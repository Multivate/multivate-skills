"use client";

import { CheckCircle2, Headphones, Lock, Mic, PenLine, Star, Trophy, Type, Volume2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { phraseEnglish, phraseUsage } from "@/lib/classroom-copy";
import { SpeechHeardFeedback, speechMatches } from "@/components/player/SpeechHeardFeedback";
import { useClassroomVoice } from "@/hooks/useClassroomVoice";

export const PASS_MARK = 70;
export const XP_LEARNED = 40;
export const XP_PASS = 120;
export const XP_CORRECT = 20;

export type LessonPhrase = {
  id: string;
  source_text: string;
  target_text: string;
  audio_url: string | null;
};

export type AssessmentRecord = { scorePct: number; passed: boolean; at: string };

type Kind = "listen" | "meaning" | "choose" | "spell" | "write" | "speak" | "usage";
type Option = { id: string; text: string };
type Question = {
  id: string;
  kind: Kind;
  skill: string;
  prompt: string;
  options: Option[];
  correctId?: string;
  answer?: string;
  speak?: string;
  audioUrl?: string | null;
};

const FALLBACK_EN = ["Hello", "Thank you", "Please", "Good morning", "Excuse me", "Yes", "How are you?"];
const FALLBACK_DE = ["Hallo", "Danke", "Bitte", "Guten Morgen", "Entschuldigung", "Ja", "Wie geht es dir?"];
const FALLBACK_USE = [
  "When you greet someone.",
  "When you thank someone.",
  "When you ask for help.",
  "When you introduce yourself.",
  "When you say where you live.",
];

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function distractors(correct: string, pool: string[], extra: string[]) {
  const unique = [...new Set([...pool, ...extra].filter((row) => row && row !== correct))];
  const picked = shuffle(unique).slice(0, 3);
  while (picked.length < 3) picked.push(`Option ${picked.length + 1}`);
  return picked;
}

export function classroomXp(learnedCount: number, passedLessons: number) {
  return learnedCount * XP_LEARNED + passedLessons * XP_PASS;
}

export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function blanks(text: string) {
  return text.replace(/[^\s]/g, "_");
}

function mcq(id: string, kind: Kind, skill: string, prompt: string, correct: string, pool: string[], extra: string[]): Question {
  const options = shuffle([
    { id: `c_${id}`, text: correct },
    ...distractors(correct, pool, extra).map((text, i) => ({ id: `d_${id}_${i}`, text })),
  ]);
  return { id, kind, skill, prompt, options, correctId: `c_${id}` };
}

export function buildLessonQuiz(phrases: LessonPhrase[]): Question[] {
  const pool = phrases.filter((row) => row.source_text.trim() && row.target_text.trim());
  if (!pool.length) return [];
  const sources = pool.map((row) => phraseEnglish(row.source_text, row.target_text));
  const targets = pool.map((row) => row.target_text);
  const uses = pool.map((row) => phraseUsage(row.source_text, row.target_text));
  const buckets: Record<Kind, Question[]> = {
    listen: [],
    meaning: [],
    choose: [],
    spell: [],
    write: [],
    speak: [],
    usage: [],
  };

  shuffle(pool).forEach((row, index) => {
    const english = phraseEnglish(row.source_text, row.target_text);
    buckets.meaning.push(
      mcq(`m_${row.id}_${index}`, "meaning", "Reading", `What does “${row.target_text}” mean?`, english, sources, FALLBACK_EN),
    );
    buckets.choose.push(
      mcq(`c_${row.id}_${index}`, "choose", "Vocabulary", `Choose the German for “${english}”.`, row.target_text, targets, FALLBACK_DE),
    );
    buckets.usage.push(
      mcq(`u_${row.id}_${index}`, "usage", "Usage", `When would you say “${row.target_text}”?`, phraseUsage(row.source_text, row.target_text), uses, FALLBACK_USE),
    );
    buckets.listen.push({
      id: `l_${row.id}_${index}`,
      kind: "listen",
      skill: "Listening",
      prompt: "Listen to the German, then choose the English meaning.",
      options: shuffle([
        { id: `c_l_${row.id}_${index}`, text: english },
        ...distractors(english, sources, FALLBACK_EN).map((text, i) => ({ id: `d_l_${row.id}_${index}_${i}`, text })),
      ]),
      correctId: `c_l_${row.id}_${index}`,
      speak: row.target_text,
      audioUrl: row.audio_url,
    });
    buckets.spell.push({
      id: `sp_${row.id}_${index}`,
      kind: "spell",
      skill: "Spelling",
      prompt: `Spell the German for “${english}”.`,
      options: [],
      answer: row.target_text,
    });
    buckets.write.push({
      id: `w_${row.id}_${index}`,
      kind: "write",
      skill: "Writing",
      prompt: `Write the German line for “${english}”.`,
      options: [],
      answer: row.target_text,
    });
    buckets.speak.push({
      id: `sk_${row.id}_${index}`,
      kind: "speak",
      skill: "Speaking",
      prompt: `Say ${row.target_text}`,
      options: [],
      answer: row.target_text,
      speak: row.target_text,
      audioUrl: row.audio_url,
    });
  });

  const mixed: Question[] = [];
  const order: Kind[] = ["listen", "speak", "meaning", "spell", "write", "choose", "usage"];
  const cap = Math.min(8, Math.max(6, pool.length * 2));
  while (mixed.length < cap) {
    let added = false;
    for (const kind of order) {
      const next = buckets[kind].shift();
      if (!next) continue;
      mixed.push(next);
      added = true;
      if (mixed.length >= cap) break;
    }
    if (!added) break;
  }
  return mixed;
}

function playClip(question: Question, voice: (text: string) => void) {
  if (question.audioUrl) {
    const audio = new Audio(question.audioUrl);
    void audio.play().catch(() => {
      if (question.speak) voice(question.speak);
    });
    return;
  }
  if (question.speak) voice(question.speak);
}

function SkillIcon({ kind }: { kind: Kind }) {
  if (kind === "listen") return <Headphones className="h-4 w-4 text-[#1457D0]" />;
  if (kind === "speak") return <Mic className="h-4 w-4 text-[#1457D0]" />;
  if (kind === "spell") return <Type className="h-4 w-4 text-[#1457D0]" />;
  if (kind === "write") return <PenLine className="h-4 w-4 text-[#1457D0]" />;
  return <Star className="h-4 w-4 text-[#1457D0]" />;
}

export function ClassroomAssessment({
  lessonTitle,
  lessonKey,
  slug,
  preview,
  phrases,
  previous,
  onSaved,
  onNextLesson,
  nextLabel,
  voiceLine,
}: {
  lessonTitle: string;
  lessonKey: string;
  slug: string;
  preview: boolean;
  phrases: LessonPhrase[];
  previous: AssessmentRecord | null;
  onSaved: (key: string, result: AssessmentRecord, xpEarned: number) => void;
  onNextLesson: (() => void) | null;
  nextLabel: string | null;
  voiceLine: (text: string) => void;
}) {
  const speak = useClassroomVoice("de-DE");
  const [seed, setSeed] = useState(0);
  const quiz = useMemo(() => buildLessonQuiz(phrases), [phrases, lessonKey, seed]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(previous?.scorePct ?? 0);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    setIndex(0);
    setPicked(null);
    setTyped("");
    setChecked(false);
    setOk(false);
    setCorrect(0);
    setDone(false);
    setPct(previous?.scorePct ?? 0);
    setXpEarned(0);
    speak.setHeard("");
    speak.clearClip();
  }, [lessonKey, seed]);

  const current = quiz[index];
  const progress = quiz.length ? Math.round(((index + (checked ? 1 : 0)) / quiz.length) * 100) : 0;
  const isChoice = current ? ["listen", "meaning", "choose", "usage"].includes(current.kind) : false;
  const isTyped = current ? current.kind === "spell" || current.kind === "write" : false;

  useEffect(() => {
    if (!current || current.kind !== "listen" || checked) return;
    const timer = window.setTimeout(() => playClip(current, voiceLine), 400);
    return () => window.clearTimeout(timer);
  }, [current?.id, checked]);

  useEffect(() => {
    if (!current || current.kind !== "speak" || checked || speak.recording) return;
    if (!speak.heard.trim()) return;
    check();
  }, [speak.recording, speak.heard, current?.id, checked]);

  function ready() {
    if (!current) return false;
    if (isChoice) return Boolean(picked);
    if (isTyped) return Boolean(typed.trim());
    if (current.kind === "speak") return Boolean(speak.heard.trim());
    return false;
  }

  function check() {
    if (!current || checked || !ready()) return;
    let pass = false;
    if (isChoice) pass = picked === current.correctId;
    else if (isTyped) pass = normalize(typed) === normalize(current.answer ?? "");
    else if (current.kind === "speak") pass = speechMatches(current.answer ?? "", speak.heard);
    setOk(pass);
    if (pass) setCorrect((n) => n + 1);
    setChecked(true);
  }

  function next() {
    if (!checked || !quiz.length) return;
    if (index + 1 >= quiz.length) {
      const score = Math.round((correct / quiz.length) * 100);
      const passed = score >= PASS_MARK;
      const xp = correct * XP_CORRECT + (passed ? XP_PASS : 0);
      setPct(score);
      setXpEarned(xp);
      setDone(true);
      const result = { scorePct: score, passed, at: new Date().toISOString() };
      onSaved(lessonKey, result, xp);
      if (!preview) {
        void fetch("/api/player/audio/assessment", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course_slug: slug, module_key: lessonKey, score_pct: score }),
        }).catch(() => null);
      }
      return;
    }
    setIndex((n) => n + 1);
    setPicked(null);
    setTyped("");
    setChecked(false);
    setOk(false);
    speak.setHeard("");
    speak.clearClip();
    speak.stop();
  }

  function restart() {
    setSeed((n) => n + 1);
  }

  if (!quiz.length) {
    return (
      <div className="cr-surface mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col items-center justify-center rounded-[22px] p-8 text-center">
        <Trophy className="h-10 w-10 text-amber-400" />
        <p className="mt-3 text-lg font-extrabold">No questions yet</p>
        <p className="cr-muted mt-1 text-sm">This module needs more lines before an assessment can run.</p>
      </div>
    );
  }

  if (done) {
    const passed = pct >= PASS_MARK;
    return (
      <div className="cr-surface mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-y-auto rounded-[22px] p-6 shadow-sm sm:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cr-accent)_18%,var(--cr-surface))]">
          {passed ? <Trophy className="h-10 w-10 text-amber-400" /> : <Lock className="h-9 w-9 text-[#1457D0]" />}
        </div>
        <h1 className="mt-5 text-center text-2xl font-extrabold">{passed ? "Module passed" : "Keep practising"}</h1>
        <p className="cr-muted mt-2 text-center text-sm">
          {lessonTitle} · you scored <span className="font-bold cr-text">{pct}%</span>
          {passed ? ". Next module is unlocked." : ` · you need ${PASS_MARK}% to move on.`}
        </p>
        <p className="cr-muted mt-2 text-center text-xs">Listening, speaking, spelling, writing, and reading in one test.</p>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="cr-surface-soft rounded-[16px] px-3 py-4 text-center">
            <p className="text-2xl font-extrabold">{pct}%</p>
            <p className="cr-muted text-[11px] font-bold uppercase tracking-wide">Score</p>
          </div>
          <div className="cr-surface-soft rounded-[16px] px-3 py-4 text-center">
            <p className="text-2xl font-extrabold">
              {correct}/{quiz.length}
            </p>
            <p className="cr-muted text-[11px] font-bold uppercase tracking-wide">Correct</p>
          </div>
          <div className="cr-surface-soft rounded-[16px] px-3 py-4 text-center">
            <p className="text-2xl font-extrabold text-[#1457D0]">+{xpEarned}</p>
            <p className="cr-muted text-[11px] font-bold uppercase tracking-wide">XP</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={restart} className="h-11 rounded-full bg-[#1457D0] px-5 text-sm font-semibold text-white">
            Retake assessment
          </button>
          {passed && onNextLesson ? (
            <button type="button" onClick={onNextLesson} className="cr-chip h-11 rounded-full px-5 text-sm font-semibold">
              {nextLabel || "Next module"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="cr-surface mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-[22px] p-4 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="cr-muted text-[11px] font-bold uppercase tracking-[0.16em]">Module assessment</p>
          <h1 className="mt-1 text-lg font-extrabold">{lessonTitle}</h1>
        </div>
        <span className="cr-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
          <Star className="h-3.5 w-3.5 text-amber-400" /> {correct} correct
        </span>
      </div>
      <p className="cr-muted mt-1 text-xs">
        Question {index + 1} of {quiz.length} · pass mark {PASS_MARK}%
      </p>
      <div className="cr-surface-soft mt-3 h-2 overflow-hidden rounded-full">
        <div className="h-full rounded-full bg-[#1457D0]" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full cr-chip px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
        <SkillIcon kind={current.kind} /> {current.skill}
      </div>
      <h2 className="mt-3 text-xl font-extrabold leading-snug">{current.prompt}</h2>

      {current.kind === "listen" || current.kind === "speak" ? (
        <button
          type="button"
          onClick={() => playClip(current, voiceLine)}
          className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#1457D0] px-4 py-2 text-sm font-semibold text-white"
        >
          <Volume2 className="h-4 w-4" /> Play model audio
        </button>
      ) : null}

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        {isChoice ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {current.options.map((option, optionIndex) => {
              const selected = picked === option.id;
              const showOk = checked && option.id === current.correctId;
              const showBad = checked && selected && option.id !== current.correctId;
              const state = showOk ? "cr-option-ok" : showBad ? "cr-option-bad" : selected ? "cr-option-on" : "cr-option";
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={checked}
                  onClick={() => setPicked(option.id)}
                  className={`${state} flex items-center gap-3 rounded-[16px] px-4 py-4 text-left text-sm font-semibold`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs font-extrabold">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="min-w-0 flex-1">{option.text}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {isTyped ? (
          <div>
            {current.kind === "spell" && current.answer ? (
              <p className="cr-muted mb-3 font-mono text-lg tracking-[0.35em]">{blanks(current.answer)}</p>
            ) : null}
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={checked}
              autoComplete="off"
              spellCheck={false}
              placeholder={current.kind === "spell" ? "Type the German spelling" : "Type the full German line"}
              className="h-12 w-full rounded-[14px] border border-[var(--cr-border)] bg-[var(--cr-surface-soft)] px-4 text-base font-semibold outline-none focus:border-[#1457D0]"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  check();
                }
              }}
            />
            {checked && !ok ? <p className="mt-2 text-sm font-semibold text-rose-400">Correct: {current.answer}</p> : null}
          </div>
        ) : null}

        {current.kind === "speak" ? (
          <div>
            <button
              type="button"
              onClick={() => speak.toggle()}
              disabled={checked}
              className={`inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white ${speak.recording ? "bg-rose-500" : "bg-[#1457D0]"}`}
            >
              <Mic className="h-5 w-5" />
              {speak.recording ? "Stop" : "Speak"}
            </button>
            <SpeechHeardFeedback
              expect={current.answer ?? ""}
              heard={speak.heard}
              recording={speak.recording}
              error={speak.error}
              clipUrl={speak.clipUrl}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cr-border)] pt-4">
        <p className="min-h-5 text-sm font-semibold">
          {checked ? (
            ok ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Correct · +{XP_CORRECT} XP
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-400">
                <XCircle className="h-4 w-4" /> Not quite
              </span>
            )
          ) : (
            <span className="cr-muted">
              {isChoice
                ? "Pick an answer, then check it."
                : current.kind === "speak"
                  ? "Tap Speak, say the line, tap Stop."
                  : "Type your answer, then check it."}
            </span>
          )}
        </p>
        {!checked ? (
          <button
            type="button"
            disabled={!ready()}
            onClick={check}
            className="h-11 rounded-full bg-[#1457D0] px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Check answer
          </button>
        ) : (
          <button type="button" onClick={next} className="h-11 rounded-full bg-[#1457D0] px-5 text-sm font-semibold text-white">
            {index + 1 >= quiz.length ? "See results" : "Next question"}
          </button>
        )}
      </div>
    </div>
  );
}
