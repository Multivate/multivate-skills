"use client";

import { useEffect, useState } from "react";
import { formInputClass, formLabelClass, formTextareaClass } from "@/lib/form-styles";

type MessageRow = {
  id: string;
  from_me: boolean;
  correspondent_name: string;
  correspondent_email: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export default function DashboardMessagesPage() {
  const [rows, setRows] = useState<MessageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    const res = await fetch("/api/messages/me", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof data?.detail === "string" ? data.detail : "We couldn't load your messages.");
      setRows([]);
      return;
    }
    setError(null);
    setRows(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const send = async () => {
    setSent(null);
    setBusy(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: toEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSent(typeof data?.detail === "string" ? data.detail : "We couldn't send your message.");
        return;
      }
      setToEmail("");
      setSubject("");
      setBody("");
      setSent("Message sent.");
      await load();
    } catch {
      setSent("Connection problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (id: string) => {
    await fetch(`/api/messages/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    await load();
  };

  if (rows === null) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border border-neutral-200/90 bg-brand-surface dark:border-zinc-800/90 dark:bg-zinc-900 p-10 text-center shadow-none">
        <p className="text-sm font-medium text-neutral-500">Loading inbox…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-xl font-semibold tracking-tighter text-brand-ink sm:text-2xl">Messages</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
          Email anyone on Multivate, and read what they send you.
        </p>
      </header>

      <section className="rounded-md border border-neutral-200/90 bg-brand-surface dark:border-zinc-800/90 dark:bg-zinc-900 p-6 shadow-none sm:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Compose</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={`${formLabelClass} sm:col-span-2`}>
            Recipient email
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className={formInputClass}
              placeholder="colleague@example.com"
              autoComplete="email"
            />
          </label>
          <label className={`${formLabelClass} sm:col-span-2`}>
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={formInputClass}
            />
          </label>
          <label className={`${formLabelClass} sm:col-span-2`}>
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className={formTextareaClass}
            />
          </label>
        </div>
        {sent ? <p className="mt-4 text-sm font-medium text-zinc-800">{sent}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="btn-primary-brand mt-6 !px-6 !py-2.5 text-sm disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send message"}
        </button>
      </section>

      {error ? (
        <p className="text-sm font-medium text-red-800">{error}</p>
      ) : (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Inbox</h2>
          {rows.length === 0 ? (
            <div className="mt-6 rounded-md border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-12 text-center">
              <p className="text-sm text-neutral-500">No messages yet.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-md border px-5 py-4 shadow-none ${
                    m.from_me ? "border-neutral-200/90 bg-brand-surface" : "border-neutral-200/90 bg-brand-surface"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase text-neutral-500">{m.from_me ? "Sent" : "Received"}</p>
                      <p className="mt-1 font-semibold text-brand-ink">{m.correspondent_name}</p>
                      <p className="text-xs text-neutral-500">{m.correspondent_email}</p>
                    </div>
                    <time className="text-xs text-neutral-500">{new Date(m.created_at).toLocaleString()}</time>
                  </div>
                  <p className="mt-3 font-semibold text-zinc-800">{m.subject}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{m.body}</p>
                  {!m.from_me && !m.read_at ? (
                    <button
                      type="button"
                      onClick={() => void markRead(m.id)}
                      className="mt-4 text-xs font-bold text-brand-primary hover:underline"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
