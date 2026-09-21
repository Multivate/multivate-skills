"use client";

import { Loader2, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { GuidanceMessageContent } from "@/components/guidance/GuidanceMessageContent";

type Turn = { role: "user" | "assistant"; content: string };

export function AiGuidanceChat() {
  const t = useTranslations("kazzy");
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
    const history = turns.slice(-10).map((turn) => ({ role: turn.role, content: turn.content }));
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
        setErr(readApiError(data, t("errorGeneric")));
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
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md bg-brand-ink px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary active:scale-[0.98] sm:bottom-6 sm:right-6"
          aria-expanded={false}
          aria-label={t("openAria")}
        >
          <MessageCircle className="h-5 w-5 text-brand-accent" />
          <span className="hidden sm:inline">{t("name")}</span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed bottom-4 right-4 z-50 flex h-[min(32rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border border-brand-ink/10 bg-brand-paper shadow-sm sm:bottom-6 sm:right-6">
          <header className="flex shrink-0 items-center justify-between border-b border-brand-ink/10 bg-brand-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ink font-display text-sm font-bold text-brand-accent">
                V
              </div>
              <div>
                <p className="font-display text-sm font-bold text-brand-ink">{t("name")}</p>
                <p className="text-xs text-brand-ink/55">{t("tagline")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {turns.length > 0 ? (
                <button
                  type="button"
                  onClick={startNewChat}
                  className="rounded-md p-2 text-brand-ink/50 transition hover:bg-brand-muted hover:text-brand-ink"
                  aria-label={t("newChatAria")}
                  title={t("newChatAria")}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-brand-ink/50 transition hover:bg-brand-muted hover:text-brand-ink"
                aria-label={t("closeAria")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {turns.length === 0 ? (
              <div className="border border-brand-ink/10 bg-brand-surface px-4 py-5 text-sm text-brand-ink/70">
                <p className="font-display text-base font-semibold text-brand-ink">{t("greeting")}</p>
                <p className="mt-2 leading-relaxed">{t("intro")}</p>
              </div>
            ) : null}
            {turns.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] px-3.5 py-2.5 text-sm ${
                    turn.role === "user"
                      ? "rounded-md bg-brand-ink text-white"
                      : "rounded-md border border-brand-ink/10 bg-brand-surface text-brand-ink"
                  }`}
                >
                  {turn.role === "assistant" ? (
                    <GuidanceMessageContent content={turn.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{turn.content}</span>
                  )}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-brand-ink/50">
                <Loader2 className="h-4 w-4 animate-spin text-brand-accent" />
                {t("thinking")}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {err ? <p className="shrink-0 px-4 text-xs text-red-600">{err}</p> : null}

          <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-brand-ink/10 bg-brand-surface p-3">
            <input
              type="text"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-brand-ink/15 bg-brand-paper px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              placeholder={t("placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-accent text-white transition hover:bg-brand-accent-dark active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("sendAria")}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
