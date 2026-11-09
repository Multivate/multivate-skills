"use client";

import { RotateCcw, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { GuidanceMessageContent } from "@/components/guidance/GuidanceMessageContent";
import { usePathname } from "@/i18n/navigation";

type Turn = { role: "user" | "assistant"; content: string };

function LenaFace({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/marketing/heads/head-4.jpg"
      alt=""
      className={`shrink-0 rounded-full object-cover object-[center_18%] ring-2 ring-white ${className}`}
    />
  );
}

export function AiGuidanceChat() {
  const t = useTranslations("kazzy");
  const pathname = usePathname();
  const hidden = pathname.includes("/register") || pathname.includes("/login") || pathname.includes("/forgot-password");
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState("100dvh");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const prompts = [t("promptGerman"), t("promptStudy"), t("promptWork"), t("promptCourse")];

  useEffect(() => {
    try {
      localStorage.removeItem("multivate_ai_session");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, open, busy]);

  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia("(min-width: 640px)").matches;
    if (wide) {
      const id = window.setTimeout(() => fieldRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const apply = () => {
      const mobile = window.innerWidth < 640;
      const height = window.visualViewport?.height ?? window.innerHeight;
      setSheetHeight(mobile ? `${Math.round(height)}px` : "");
    };
    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.addEventListener("resize", apply);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.removeEventListener("resize", apply);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function startNewChat() {
    setTurns([]);
    setSessionId("");
    setInput("");
    setErr(null);
  }

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setErr(null);
    setInput("");
    const history = turns.slice(-10).map((turn) => ({ role: turn.role, content: turn.content }));
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    try {
      const res = await fetch("/api/guidance/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
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

  if (hidden) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-[#10244F] pl-1.5 pr-4 text-white shadow-[0_12px_28px_rgba(16,36,79,0.32)] transition duration-200 hover:bg-brand-accent sm:bottom-6 sm:right-6"
          aria-expanded={false}
          aria-label={t("openAria")}
        >
          <span className="relative">
            <LenaFace className="h-11 w-11 ring-0" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#3DDC97] ring-2 ring-[#10244F]" />
          </span>
          <span className="hidden pr-1 text-sm font-semibold sm:inline">{t("name")}</span>
        </button>
      ) : null}

      {open ? (
        <div
          className="fixed inset-x-0 top-0 z-50 flex w-full flex-col overflow-hidden bg-[#EFEFEA] sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(40rem,calc(100dvh-2.5rem))] sm:w-[24.5rem] sm:rounded-[18px] sm:border sm:border-black/5 sm:shadow-[0_24px_64px_rgba(16,36,79,0.22)]"
          style={sheetHeight ? { height: sheetHeight } : undefined}
        >
          <header className="flex shrink-0 items-center justify-between bg-white px-3 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] shadow-[0_1px_0_rgba(16,36,79,0.06)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative">
                <LenaFace />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#3DDC97] ring-2 ring-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight text-[#111]">{t("name")}</p>
                <p className="text-[12px] text-[#667085]">{t("tagline")}</p>
              </div>
            </div>
            <div className="flex items-center">
              {turns.length > 0 ? (
                <button
                  type="button"
                  onClick={startNewChat}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[#667085] hover:bg-black/5"
                  aria-label={t("newChatAria")}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#667085] hover:bg-black/5"
                aria-label={t("closeAria")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 [-webkit-overflow-scrolling:touch]">
            {turns.length === 0 ? (
              <div className="flex items-end gap-2">
                <LenaFace className="h-7 w-7" />
                <div className="max-w-[88%] rounded-[20px] rounded-bl-[6px] bg-white px-3.5 py-3 text-[#111] shadow-[0_1px_2px_rgba(16,36,79,0.06)]">
                  <p className="text-[15px] font-semibold">{t("greeting")}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#333]">{t("intro")}</p>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="rounded-full border border-[#10244F]/12 bg-[#F7F8F4] px-3 py-2 text-left text-[13px] font-medium text-[#10244F] active:bg-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {turns.map((turn, i) => (
              <div key={`${turn.role}-${i}`} className={`flex ${turn.role === "user" ? "justify-end" : "items-end gap-2"}`}>
                {turn.role === "assistant" ? <LenaFace className="h-7 w-7" /> : null}
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 text-[15px] leading-relaxed ${
                    turn.role === "user"
                      ? "rounded-[20px] rounded-br-[6px] bg-[#1457D0] text-white"
                      : "rounded-[20px] rounded-bl-[6px] bg-white text-[#111] shadow-[0_1px_2px_rgba(16,36,79,0.06)]"
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
              <div className="flex items-end gap-2">
                <LenaFace className="h-7 w-7" />
                <div className="flex items-center gap-1 rounded-[20px] rounded-bl-[6px] bg-white px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#98A2B3]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#98A2B3] [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#98A2B3] [animation-delay:300ms]" />
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          {err ? <p className="shrink-0 px-4 pb-1 text-xs text-red-600">{err}</p> : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
            className="shrink-0 bg-[#EFEFEA] px-3 pt-1 pb-[max(0.55rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2">
              <input
                ref={fieldRef}
                type="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                className="min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-3 text-[16px] text-[#111] shadow-[0_1px_2px_rgba(16,36,79,0.06)] outline-none placeholder:text-[#98A2B3]"
                placeholder={t("placeholder")}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1457D0] text-white disabled:opacity-40"
                aria-label={t("sendAria")}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
