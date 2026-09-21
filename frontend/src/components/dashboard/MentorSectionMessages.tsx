"use client";

import { Loader2, MessageSquare, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";

type Conversation = {
  id: string;
  visitor_name: string;
  visitor_email: string | null;
  last_message_preview: string | null;
  unread_count: number;
};

type ChatMessage = {
  id: string;
  sender_kind: string;
  body: string;
};

export function MentorSectionMessages() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    const res = await fetch("/api/mentor/conversations", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(readApiError(data, "Could not load messages."));
      setConversations([]);
      return;
    }
    setConversations(Array.isArray(data) ? data : []);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/mentor/conversations/${id}/messages`, { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setMessages(data);
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (activeId) void loadThread(activeId);
  }, [activeId, loadThread]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/mentor/conversations/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "Message not sent."));
        return;
      }
      setDraft("");
      setMessages((prev) => [...prev, data as ChatMessage]);
      await loadInbox();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-md border border-neutral-200 bg-brand-surface dark:border-zinc-800 ">
        <div className="border-b border-neutral-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-ink dark:text-white">
            <MessageSquare className="h-4 w-4 text-brand-accent" />
            Inbox
          </h2>
        </div>
        {conversations === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No messages yet.</p>
        ) : (
          <ul className="max-h-[28rem] overflow-y-auto">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`w-full border-b border-neutral-50 px-4 py-3 text-left transition hover:bg-neutral-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${
                    activeId === c.id ? "bg-brand-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-brand-ink dark:text-white">{c.visitor_name}</span>
                    {c.unread_count > 0 ? (
                      <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold text-white">{c.unread_count}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{c.last_message_preview}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="flex min-h-[24rem] flex-col rounded-md border border-neutral-200 bg-brand-surface dark:border-zinc-800 ">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-500">Select a conversation.</div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = m.sender_kind === "mentor";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-md px-3.5 py-2.5 text-sm ${mine ? "bg-brand-primary text-white" : "bg-neutral-100 text-zinc-800 dark:bg-zinc-800"}`}>
                      {m.body}
                    </div>
                  </div>
                );
              })}
            </div>
            {err ? <p className="px-4 text-sm text-red-600">{err}</p> : null}
            <form onSubmit={sendReply} className="flex gap-2 border-t border-neutral-100 p-3 dark:border-zinc-800">
              <input
                className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-brand-surface px-3 py-2 text-sm text-brand-ink outline-none transition placeholder:text-neutral-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 dark:border-neutral-500 dark:bg-zinc-800 dark:text-neutral-100"
                placeholder="Write your reply…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-accent text-white shadow-none transition hover:bg-brand-accent-dark active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send reply"
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
