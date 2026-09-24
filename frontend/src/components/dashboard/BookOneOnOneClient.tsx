"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/auth-context";
import { CheckCircle2, Copy, Loader2, Users } from "lucide-react";

type Tier = {
  tier: "standard" | "professional" | "native_professional";
  label: string;
  description: string;
  amount_cents: number;
  currency: string;
  duration_minutes: number;
  billed_hours: number;
};

type Mentor = {
  slug: string;
  full_name: string;
  headline?: string;
  photo_url?: string | null;
};

type Instructions = {
  bank_name: string;
  account_name: string;
  account_number: string;
  amount_cents: number;
  currency: string;
  payment_reference: string;
  student_code: string;
  course_title: string;
};

type RemitaCheckout = {
  rrr: string;
  merchant_id: string;
  payment_hash: string;
  payment_gateway_url: string;
  response_url: string;
  amount_cents: number;
  currency: string;
  payment_reference: string;
};

type StartResponse = {
  booking: { id: string; tier: string; status: string };
  student_code: string;
  payment?: { payment_reference?: string; status?: string; amount_cents?: number; currency?: string };
  instructions?: Instructions;
  remita?: RemitaCheckout;
  message?: string;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function BookOneOnOneClient() {
  const searchParams = useSearchParams();
  const courseSlug = (searchParams.get("course") ?? "").trim();
  const mentorPref = (searchParams.get("mentor") ?? "").trim();
  const { user, loading: authLoading } = useAuth();

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [tier, setTier] = useState<Tier["tier"]>("standard");
  const [mentorSlug, setMentorSlug] = useState(mentorPref);
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<StartResponse | null>(null);
  const [txnRef, setTxnRef] = useState("");
  const [amountSent, setAmountSent] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const remitaFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    void (async () => {
      const [tRes, mRes] = await Promise.all([
        fetch("/api/mentor-sessions/tiers", { cache: "no-store" }),
        fetch("/api/mentors", { cache: "no-store" }),
      ]);
      const tData = await tRes.json().catch(() => null);
      const mData = await mRes.json().catch(() => null);
      if (Array.isArray(tData)) setTiers(tData as Tier[]);
      if (Array.isArray(mData)) setMentors(mData as Mentor[]);
      else if (Array.isArray(mData?.mentors)) setMentors(mData.mentors as Mentor[]);
    })();
  }, []);

  useEffect(() => {
    if (mentorPref) setMentorSlug(mentorPref);
  }, [mentorPref]);

  const selectedTier = tiers.find((t) => t.tier === tier);
  const totalCents = selectedTier ? selectedTier.amount_cents * hours : 0;

  const start = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mentor-sessions/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          mentor_slug: mentorSlug || null,
          course_slug: courseSlug || null,
          preferred_time_note: note.trim() || null,
          billed_hours: hours,
        }),
      });
      const json = (await res.json().catch(() => null)) as StartResponse | { detail?: string } | null;
      if (!res.ok) {
        setErr(typeof json === "object" && json && "detail" in json && typeof json.detail === "string" ? json.detail : "Could not start booking.");
        return;
      }
      setData(json as StartResponse);
      const remita = (json as StartResponse).remita;
      if (remita) {
        setTimeout(() => remitaFormRef.current?.submit(), 200);
      }
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }, [tier, mentorSlug, courseSlug, note, hours]);

  const claimTransfer = async () => {
    const ref = data?.payment?.payment_reference || data?.instructions?.payment_reference;
    if (!ref || !txnRef.trim()) return;
    setVerifyBusy(true);
    setErr(null);
    try {
      const cents =
        amountSent.trim() !== ""
          ? Math.round(parseFloat(amountSent.replace(/,/g, "")) * 100)
          : data?.payment?.amount_cents ?? data?.instructions?.amount_cents ?? 0;
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_reference: ref,
          transaction_reference: txnRef.trim(),
          amount_sent_cents: cents,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(typeof json?.detail === "string" ? json.detail : "Could not submit payment claim.");
        return;
      }
      setSubmitted(true);
    } catch {
      setErr("Network error.");
    } finally {
      setVerifyBusy(false);
    }
  };

  if (authLoading) {
    return <p className="text-sm text-brand-ink/55">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-md border border-brand-ink/10 bg-brand-muted/40 p-6 text-sm">
        <p className="font-semibold text-brand-ink">Sign in as a student to book a 1:1 session.</p>
        <Link href="/login" className="mt-3 inline-block text-brand-accent underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (submitted || data?.payment?.status === "awaiting_review" || data?.payment?.status === "paid") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6">
        <CheckCircle2 className="h-8 w-8 text-emerald-700" />
        <h2 className="mt-3 font-display text-xl font-bold text-brand-ink">Request received</h2>
        <p className="mt-2 text-sm text-brand-ink/70">
          We’ll confirm payment and match you with a German speaker. You’ll get a message with the meeting link.
        </p>
        <Link href="/dashboard/payments" className="mt-4 inline-block text-sm font-semibold text-brand-accent underline">
          View payments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-ink">Book an instructor</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-ink/65">
          Choose a tier. Each billed hour is <strong>45 minutes</strong> live. Prices are per hour.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((t) => {
          const active = tier === t.tier;
          return (
            <button
              key={t.tier}
              type="button"
              onClick={() => setTier(t.tier)}
              className={`rounded-md border p-4 text-left transition ${
                active ? "border-brand-accent bg-brand-accent/5 shadow-sm" : "border-brand-ink/10 bg-brand-surface hover:border-brand-ink/25"
              }`}
            >
              <p className="text-sm font-bold text-brand-ink">{t.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-ink/55">{t.description}</p>
              <p className="mt-3 font-display text-xl font-bold text-brand-accent">
                {money(t.amount_cents, t.currency)}
                <span className="text-sm font-semibold text-brand-ink/45"> / hr</span>
              </p>
              <p className="mt-1 text-[0.65rem] text-brand-ink/45">{t.duration_minutes} min session</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink/45">Hours</span>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="mt-1.5 w-full rounded-sm border border-brand-ink/15 bg-brand-surface px-3 py-2.5 text-sm"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} × 45 min ({money((selectedTier?.amount_cents ?? 0) * n, selectedTier?.currency ?? "NGN")})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink/45">Preferred mentor (optional)</span>
          <select
            value={mentorSlug}
            onChange={(e) => setMentorSlug(e.target.value)}
            className="mt-1.5 w-full rounded-sm border border-brand-ink/15 bg-brand-surface px-3 py-2.5 text-sm"
          >
            <option value="">Any available German speaker</option>
            {mentors.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.full_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-ink/45">Preferred times (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Weekday evenings WAT, or Saturday morning"
          className="mt-1.5 w-full rounded-sm border border-brand-ink/15 bg-brand-surface px-3 py-2.5 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-ink/10 bg-brand-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-brand-ink/70">
          <Users className="h-4 w-4 text-brand-accent" />
          Total for {hours} × 45 min
        </div>
        <p className="font-display text-2xl font-bold text-brand-ink">
          {money(totalCents, selectedTier?.currency ?? "NGN")}
        </p>
      </div>

      {err ? <p className="text-sm font-medium text-red-700">{err}</p> : null}

      {!data ? (
        <button
          type="button"
          disabled={busy || !selectedTier}
          onClick={() => void start()}
          className="btn-cta-accent inline-flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Continue to payment
        </button>
      ) : (
        <div className="space-y-4 rounded-md border border-brand-ink/10 bg-brand-surface p-5">
          <p className="text-sm text-brand-ink/70">{data.message}</p>
          {data.instructions ? (
            <>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-brand-ink/45">Bank</dt>
                  <dd className="font-semibold">{data.instructions.bank_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-ink/45">Account name</dt>
                  <dd className="font-semibold">{data.instructions.account_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-ink/45">Account number</dt>
                  <dd className="font-semibold">{data.instructions.account_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-brand-ink/45">Amount</dt>
                  <dd className="font-semibold">
                    {money(data.instructions.amount_cents, data.instructions.currency)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-brand-ink/45">Payment reference</dt>
                  <dd className="flex items-center gap-2 font-semibold">
                    {data.instructions.payment_reference}
                    <button
                      type="button"
                      className="text-brand-accent"
                      onClick={() => {
                        void navigator.clipboard.writeText(data.instructions!.payment_reference);
                        setCopied(true);
                      }}
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </dd>
                </div>
              </dl>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  placeholder="Bank transaction reference"
                  className="rounded-sm border border-brand-ink/15 px-3 py-2.5 text-sm"
                />
                <input
                  value={amountSent}
                  onChange={(e) => setAmountSent(e.target.value)}
                  placeholder="Amount sent (e.g. 15000)"
                  className="rounded-sm border border-brand-ink/15 px-3 py-2.5 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={verifyBusy || !txnRef.trim()}
                onClick={() => void claimTransfer()}
                className="btn-cta-accent disabled:opacity-50"
              >
                {verifyBusy ? "Submitting…" : "I have paid. Submit for review"}
              </button>
            </>
          ) : null}
        </div>
      )}

      {data?.remita ? (
        <form ref={remitaFormRef} method="POST" action={data.remita.payment_gateway_url} className="hidden">
          <input type="hidden" name="merchantId" value={data.remita.merchant_id} />
          <input type="hidden" name="rrr" value={data.remita.rrr} />
          <input type="hidden" name="hash" value={data.remita.payment_hash} />
          <input type="hidden" name="responseurl" value={data.remita.response_url} />
        </form>
      ) : null}
    </div>
  );
}
