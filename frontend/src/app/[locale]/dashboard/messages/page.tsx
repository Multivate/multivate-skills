"use client";

import { PersonMark } from "@/components/dashboard/PersonMark";
import { StudentPageHero, StudentSurface } from "@/components/dashboard/StudentPageHero";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";

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

const fieldClass =
  "mt-1.5 w-full rounded border border-[#d1d7dc] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1457D0]";

export default function DashboardMessagesPage() {
  const { user } = useAuth();
  const desk = user?.role === "instructor" || user?.role === "mentor";
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

  return (
    <>
      {desk ? null : <StudentPageHero title="Messages" subtitle="Write to instructors, mentors, or other learners on Multivate." />}
      <StudentSurface>
        {desk ? (
          <header className="mb-7">
            <p className="text-sm text-[#011B33]/50">Workspace</p>
            <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">Messages</h1>
            <p className="mt-2 text-sm text-[#011B33]/60">Write to learners and other people on Multivate.</p>
          </header>
        ) : null}
        {rows === null ? <p className="text-sm text-[#6a6f73]">Loading inbox…</p> : null}
        {rows === null ? null : (
    <div className="space-y-5">
      <section className="rounded border border-[#d1d7dc] p-5 sm:p-6">
        <h2 className="text-base font-semibold">Compose</h2>
        <div className="mt-4 grid gap-4">
          <label className="text-sm font-semibold">
            Recipient email
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className={fieldClass}
              placeholder="colleague@example.com"
              autoComplete="email"
            />
          </label>
          <label className="text-sm font-semibold">
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass} />
          </label>
          <label className="text-sm font-semibold">
            Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={fieldClass} />
          </label>
        </div>
        {sent ? <p className="mt-4 text-sm font-medium">{sent}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="mt-5 rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send message"}
        </button>
      </section>

      {error ? (
        <p className="text-sm font-medium text-red-700">{error}</p>
      ) : (
        <section className="rounded border border-[#d1d7dc] p-5 sm:p-6">
          <h2 className="text-base font-semibold">Inbox</h2>
          {rows.length === 0 ? (
            <p className="mt-6 text-sm text-[#6a6f73]">No messages yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--admin-line)]">
              {rows.map((m) => (
                <li key={m.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <PersonMark name={m.correspondent_name} className="h-9 w-9 text-xs" />
                      <div>
                        <p className="admin-muted text-[11px] font-semibold uppercase tracking-wide">{m.from_me ? "Sent" : "Received"}</p>
                        <p className="font-semibold">{m.correspondent_name}</p>
                        <p className="admin-muted text-xs">{m.correspondent_email}</p>
                      </div>
                    </div>
                    <time className="admin-muted text-xs">{new Date(m.created_at).toLocaleString()}</time>
                  </div>
                  <p className="mt-3 font-semibold">{m.subject}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                  {!m.from_me && !m.read_at ? (
                    <button type="button" onClick={() => void markRead(m.id)} className="mt-3 text-xs font-semibold text-[#1457D0]">
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
        )}
      </StudentSurface>
    </>
  );
}
