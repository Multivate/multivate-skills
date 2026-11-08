"use client";

import { StudentSurface } from "@/components/dashboard/StudentPageHero";
import { useEffect, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
};

export default function HelpSupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/support/tickets", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setTickets(data as Ticket[]);
    else setTickets([]);
  }

  useEffect(() => {
    void load().catch(() => setTickets([]));
  }, []);

  async function send() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(typeof data?.detail === "string" ? data.detail : "We couldn't send your request.");
        return;
      }
      setSubject("");
      setBody("");
      setMsg("Sent. We’ll follow up by email.");
      void load();
    } catch {
      setErr("Connection problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudentSurface>
      <div className="mx-auto max-w-3xl space-y-10">
        <header>
          <p className="text-sm text-[#011B33]/50">Account</p>
          <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">Help and support</h1>
          <p className="mt-2 text-sm text-[#011B33]/60">
            Ask about enrollments, payments, or your account. You can also email{" "}
            <a href="mailto:info@multivate.com.ng" className="font-semibold text-brand-accent hover:underline">
              info@multivate.com.ng
            </a>
            .
          </p>
        </header>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="block">
            <span className="text-sm font-semibold">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              minLength={4}
              className="mt-1.5 h-11 w-full rounded-[5px] border border-brand-ink/15 px-3 text-sm outline-none focus:border-brand-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">How can we help?</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              minLength={10}
              rows={5}
              className="mt-1.5 w-full rounded-[5px] border border-brand-ink/15 px-3 py-2.5 text-sm outline-none focus:border-brand-accent"
            />
          </label>
          {err ? <p className="text-sm text-red-700">{err}</p> : null}
          {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </form>

        <section>
          <h2 className="text-lg font-extrabold">Your requests</h2>
          {tickets === null ? <p className="mt-3 text-sm text-[#6a6f73]">Loading…</p> : null}
          {tickets && tickets.length === 0 ? <p className="mt-3 text-sm text-[#011B33]/55">No requests yet.</p> : null}
          {tickets && tickets.length > 0 ? (
            <ul className="mt-4 divide-y divide-brand-ink/10 overflow-hidden rounded-[5px] border border-brand-ink/10">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{ticket.subject}</p>
                    <span className="text-xs font-semibold uppercase text-[#011B33]/45">{ticket.status}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#011B33]/70">{ticket.body}</p>
                  <p className="mt-2 text-xs text-[#011B33]/45">{new Date(ticket.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </StudentSurface>
  );
}
