"use client";

import { useMemo, useState } from "react";

type QuizOption = { id: string; text: string };
type QuizQuestion = { id: string; prompt: string; options: QuizOption[] };
type QuizData = { passing_score_pct: number; questions: QuizQuestion[] };

type Props = {
  lessonId: string;
  title: string;
  quizJson: string | null;
  alreadyCompleted: boolean;
  onCompleted: () => void;
};

export function AssessmentPlayer({ lessonId, title, quizJson, alreadyCompleted, onCompleted }: Props) {
  const quiz = useMemo<QuizData | null>(() => {
    if (!quizJson) return null;
    try {
      const raw = JSON.parse(quizJson) as QuizData;
      if (!Array.isArray(raw.questions) || raw.questions.length === 0) return null;
      return {
        passing_score_pct: Number(raw.passing_score_pct) || 70,
        questions: raw.questions,
      };
    } catch {
      return null;
    }
  }, [quizJson]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    passed: boolean;
    score_pct: number;
    passing_score_pct: number;
    correct: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!quiz) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-brand-muted px-6 text-center text-sm text-brand-ink/60">
        This assessment has no questions yet. Ask your instructor to add some in Course Studio.
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/player/quiz/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId, answers }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.detail === "string" ? data.detail : "We couldn't grade that assessment.");
        return;
      }
      setResult(data);
      if (data?.passed) onCompleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-brand-surface px-6 py-8">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">Assessment</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-brand-ink">{title}</h2>
        <p className="mt-2 text-sm text-brand-ink/60">
          Pass mark: {quiz.passing_score_pct}%. Answer every question, then submit.
        </p>
        {alreadyCompleted ? (
          <p className="mt-2 text-sm font-semibold text-emerald-700">You already passed this assessment.</p>
        ) : null}
      </div>

      <ol className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <li key={q.id} className="border border-brand-ink/10 p-4">
            <p className="text-sm font-semibold text-brand-ink">
              {idx + 1}. {q.prompt}
            </p>
            <ul className="mt-3 space-y-2">
              {(q.options || []).map((opt) => {
                const selected = answers[q.id] === opt.id;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      disabled={busy || alreadyCompleted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                      className={`w-full border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-ink"
                          : "border-brand-ink/15 bg-brand-surface text-brand-ink/80 hover:border-brand-ink/30"
                      }`}
                    >
                      {opt.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {result ? (
        <p className={`text-sm font-semibold ${result.passed ? "text-emerald-700" : "text-amber-800"}`}>
          Score {result.score_pct}% ({result.correct}/{result.total}).{" "}
          {result.passed ? "Passed - progress updated." : `Need ${result.passing_score_pct}% to pass. Try again.`}
        </p>
      ) : null}

      {!alreadyCompleted ? (
        <button
          type="button"
          disabled={busy || !allAnswered}
          onClick={() => void submit()}
          className="btn-cta-accent disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit assessment"}
        </button>
      ) : null}
    </div>
  );
}
