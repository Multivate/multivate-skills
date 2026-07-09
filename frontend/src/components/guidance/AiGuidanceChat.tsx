"use client";

import { Bot, Loader2, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { GuidanceMessageContent } from "@/components/guidance/GuidanceMessageContent";

type Turn = { role: "user" | "assistant"; content: string };

export function AiGuidanceChat() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.removeItem("multivate_ai_session");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open]);

  function startNewChat() {
    setTurns([]);
    setSessionId("");
    setInput("");
    setErr(null);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    setInput("");
    const history = turns.slice(-10).map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [...prev, { role: "user", content: text }]);
    try {
      const res = await fetch("/api/guidance/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId || undefined,
          history,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "Something went wrong. Try again."));
        return;
      }
      if (data.session_id) setSessionId(data.session_id);
      setTurns((prev) => [...prev, { role: "assistant", content: String(data.reply ?? "") }]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition hover:scale-[1.03] hover:shadow-xl active:scale-[0.98] sm:bottom-6 sm:right-6"
          aria-expanded={false}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Multivate AI</span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(32rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:bottom-6 sm:right-6">
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-ink dark:text-white">Multivate AI</p>
                <p className="text-xs text-slate-500">Germany pathways, language, careers</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {turns.length > 0 ? (
                <button
                  type="button"
                  onClick={startNewChat}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Start a new chat"
                  title="New chat"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close Multivate AI"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {turns.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                <p className="font-semibold text-brand-ink dark:text-white">Multivate AI</p>
                <p className="mt-2">Ask about Germany, German, study, or work.</p>
              </div>
            ) : null}
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    t.role === "user"
                      ? "whitespace-pre-wrap bg-brand-primary text-white"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  }`}
                >
                  {t.role === "assistant" ? <GuidanceMessageContent content={t.content} /> : t.content}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-brand-accent" />
                Thinking…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {err ? <p className="shrink-0 px-4 text-xs text-red-600">{err}</p> : null}

          <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <input
              type="text"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Ask something…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-white shadow-sm transition hover:bg-brand-accent-dark active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
