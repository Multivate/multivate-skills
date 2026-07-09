"use client";

import { Loader2, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { readApiError } from "@/lib/api-error";

type ChatMessage = {
  id: string;
  sender_kind: string;
  body: string;
  created_at: string;
};

type Props = {
  mentorSlug: string;
  mentorName: string;
  open: boolean;
  onClose: () => void;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-brand-ink outline-none transition placeholder:text-slate-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function storageKey(slug: string) {
  return `multivate_mentor_chat_${slug}`;
}

export function hasMentorChatSession(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(storageKey(slug)));
  } catch {
    return false;
  }
}

type StoredSession = {
  conversationId: string;
  guestToken: string;
  visitorName: string;
};

export function MentorChatPanel({ mentorSlug, mentorName, open, onClose }: Props) {
  const t = useTranslations("mentors.chat");
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(storageKey(mentorSlug));
      if (raw) setSession(JSON.parse(raw) as StoredSession);
    } catch {
      setSession(null);
    }
  }, [open, mentorSlug]);

  const loadMessages = useCallback(async () => {
    if (!session) return;
    const qs = `?guest_token=${encodeURIComponent(session.guestToken)}`;
    const res = await fetch(`/api/mentors/chat/${session.conversationId}/messages${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setMessages(data);
  }, [session]);

  useEffect(() => {
    if (session) void loadMessages();
  }, [session, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open || !session) return;
    const id = window.setInterval(() => void loadMessages(), 5000);
    return () => window.clearInterval(id);
  }, [open, session, loadMessages]);

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/mentors/${encodeURIComponent(mentorSlug)}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_name: visitorName.trim(),
          visitor_email: visitorEmail.trim() || null,
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, t("startError")));
        return;
      }
      const next: StoredSession = {
        conversationId: data.conversation_id,
        guestToken: data.guest_token,
        visitorName: visitorName.trim(),
      };
      localStorage.setItem(storageKey(mentorSlug), JSON.stringify(next));
      setSession(next);
      setMessage("");
      const qs = `?guest_token=${encodeURIComponent(next.guestToken)}`;
      const msgRes = await fetch(`/api/mentors/chat/${next.conversationId}/messages${qs}`, { cache: "no-store" });
      const msgData = await msgRes.json().catch(() => null);
      if (msgRes.ok && Array.isArray(msgData)) setMessages(msgData);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !draft.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/mentors/chat/${session.conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft.trim(), guest_token: session.guestToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, t("sendError")));
        return;
      }
      setDraft("");
      setMessages((prev) => [...prev, data as ChatMessage]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">{t("label")}</p>
            <h2 className="font-bold text-brand-ink">{mentorName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        {!session ? (
          <form onSubmit={startChat} className="space-y-4 p-4">
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <label className="block text-sm font-semibold text-slate-800">
              {t("yourName")}
              <input required className={fieldClass} value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t("yourEmail")}
              <input type="email" className={fieldClass} value={visitorEmail} onChange={(e) => setVisitorEmail(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t("yourQuestion")}
              <textarea required rows={4} className={fieldClass} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className="btn-primary-brand flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("sendFirst")}
            </button>
          </form>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = m.sender_kind === "guest" || m.sender_kind === "user";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        mine ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            {err ? <p className="px-4 text-sm text-red-600">{err}</p> : null}
            <form onSubmit={sendReply} className="flex gap-2 border-t border-slate-100 bg-white p-3">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-brand-ink outline-none placeholder:text-slate-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                placeholder={t("typeMessage")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-white shadow-sm transition hover:bg-brand-accent-dark active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
