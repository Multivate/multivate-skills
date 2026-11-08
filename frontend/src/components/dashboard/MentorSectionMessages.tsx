"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { PersonMark } from "@/components/dashboard/PersonMark";

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

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
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

  const active = conversations?.find((row) => row.id === activeId) ?? null;

  return (
    <div className="mx-auto max-w-[84rem]">
      <header className="mb-7">
        <p className="text-sm text-[#011B33]/50">Workspace</p>
        <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">Messages</h1>
        <p className="mt-2 text-sm text-[#011B33]/60">People who write from your public profile.</p>
      </header>

      <div className="grid min-h-[min(38rem,calc(100vh-16rem))] overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white shadow-[0_10px_30px_rgba(16,36,79,0.05)] lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="border-b border-brand-ink/10 bg-[#f8fafd] lg:border-b-0 lg:border-r">
          <p className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#011B33]/40">Inbox</p>
          {conversations === null ? (
            <p className="px-4 py-6 text-sm text-[#6a6f73]">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="px-4 py-8 text-sm leading-relaxed text-[#011B33]/55">No messages yet.</p>
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto lg:max-h-[calc(100vh-20rem)]">
              {conversations.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(row.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${
                      activeId === row.id ? "bg-white" : "hover:bg-white/70"
                    }`}
                  >
                    <PersonMark name={row.visitor_name} className="mt-0.5 h-9 w-9 shrink-0 text-[11px]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold">{row.visitor_name}</span>
                        {row.unread_count > 0 ? (
                          <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold text-white">
                            {row.unread_count}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs text-[#011B33]/50">{row.last_message_preview}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="flex min-h-[22rem] flex-col bg-white">
          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <p className="text-base font-extrabold">Select a conversation</p>
              <p className="mt-2 max-w-sm text-sm text-[#011B33]/50">Replies stay in this thread so the person who wrote you can continue the talk.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-brand-ink/10 px-5 py-4">
                <PersonMark name={active?.visitor_name || "Visitor"} className="h-10 w-10 text-[12px]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{active?.visitor_name}</p>
                  {active?.visitor_email ? <p className="truncate text-xs text-[#011B33]/50">{active.visitor_email}</p> : null}
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-[#fbfcfe] p-5">
                {messages.map((message) => {
                  const mine = message.sender_kind === "mentor";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-[5px] px-3.5 py-2.5 text-sm leading-relaxed ${
                          mine ? "bg-brand-accent text-white" : "bg-white text-[#011B33] shadow-[0_1px_4px_rgba(16,36,79,0.06)]"
                        }`}
                      >
                        {message.body}
                      </div>
                    </div>
                  );
                })}
              </div>
              {err ? <p className="px-5 text-sm text-red-700">{err}</p> : null}
              <form onSubmit={sendReply} className="flex gap-2 border-t border-brand-ink/10 bg-white p-3">
                <input
                  className="min-w-0 flex-1 rounded-[5px] border border-brand-ink/15 bg-[#f8fafd] px-3 py-2.5 text-sm outline-none focus:border-brand-accent focus:bg-white"
                  placeholder="Write your reply…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] bg-brand-accent text-white hover:bg-[#0f4bb8] disabled:opacity-50"
                  aria-label="Send reply"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
