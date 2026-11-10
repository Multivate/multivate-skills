"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/auth-context";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";

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
  city?: string;
  origin_country?: string | null;
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

function parseMentors(raw: unknown): Mentor[] {
  if (Array.isArray(raw)) return raw as Mentor[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { mentors?: unknown }).mentors)) {
    return (raw as { mentors: Mentor[] }).mentors;
  }
  return [];
}

export function BookOneOnOneClient() {
  const searchParams = useSearchParams();
  const tClass = useTranslations("classroom");
  const courseSlug = (searchParams.get("course") ?? "").trim();
  const mentorPref = (searchParams.get("mentor") ?? "").trim();
  const lessonId = (searchParams.get("lesson") ?? "").trim();
  const goalCode = (searchParams.get("goal") ?? "").trim();
  const fromClassroom = searchParams.get("stuck") === "1";
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
  const seededNote = useRef(false);

  useEffect(() => {
    void (async () => {
      const [tRes, mRes] = await Promise.all([
        fetch("/api/mentor-sessions/tiers", { cache: "no-store" }),
        fetch("/api/mentors", { cache: "no-store" }),
      ]);
      const tData = await tRes.json().catch(() => null);
      const mData = await mRes.json().catch(() => null);
      if (Array.isArray(tData)) setTiers(tData as Tier[]);
      setMentors(parseMentors(mData));
    })();
  }, []);

  useEffect(() => {
    if (mentorPref) setMentorSlug(mentorPref);
  }, [mentorPref]);

  useEffect(() => {
    if (seededNote.current || !fromClassroom) return;
    const bits = [
      goalCode ? `Goal: ${goalCode}` : null,
      courseSlug ? `Course: ${courseSlug}` : null,
      lessonId ? `Lesson: ${lessonId}` : null,
    ].filter(Boolean);
    if (bits.length) {
      seededNote.current = true;
      setNote(`Stuck in the classroom. ${bits.join(". ")}.`);
    }
  }, [fromClassroom, goalCode, courseSlug, lessonId]);

  const selectedTier = tiers.find((row) => row.tier === tier);
  const selectedMentor = mentors.find((row) => row.slug === mentorSlug) ?? null;
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
    return (
      <div className="min-h-[70vh] animate-pulse space-y-6">
        <div className="h-8 w-56 rounded bg-brand-ink/10" />
        <div className="h-40 rounded-[5px] bg-brand-ink/10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-[1.75rem] font-extrabold tracking-tight">Book a mentor</h1>
        <p className="mt-3 text-sm text-[#011B33]/60">Sign in as a student to book a live session.</p>
        <Link href="/login" className="mt-6 inline-flex h-11 items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  if (submitted || data?.payment?.status === "awaiting_review" || data?.payment?.status === "paid") {
    return (
      <div className="mx-auto max-w-lg py-10">
        <p className="text-sm text-[#011B33]/50">Book a mentor</p>
        <div className="mt-4 rounded-[5px] border border-emerald-200 bg-emerald-50 px-6 py-8">
          <CheckCircle2 className="h-8 w-8 text-emerald-700" />
          <h1 className="mt-3 text-2xl font-extrabold">Request received</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#011B33]/70">
            We’ll confirm payment and match you with a German speaker. You’ll get a message with the meeting link.
          </p>
          <Link href="/dashboard/payments" className="mt-6 inline-flex h-10 items-center text-sm font-semibold text-brand-accent hover:underline">
            View payments
          </Link>
        </div>
      </div>
    );
  }

  const payStep = Boolean(data);

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="text-sm text-[#011B33]/50">1:1 session</p>
        <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight text-[#011B33] sm:text-[2rem]">Book a mentor</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#011B33]/60">
          Talk with someone already living in Germany. Each billed hour is 45 minutes live. You only pay after you start a booking.
        </p>
        {fromClassroom ? (
          <p className="mt-4 rounded-[5px] border border-brand-accent/20 bg-[#f4f7fd] px-3 py-2 text-sm text-[#011B33]/75">
            {tClass("stuckBanner")}
          </p>
        ) : null}
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(17rem,0.7fr)]">
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">Who do you want to meet?</h2>
                <p className="mt-1 text-sm text-[#011B33]/55">
                  {mentors.length > 0 ? "Pick a person, or let us match you." : "We’ll match you with an approved German speaker."}
                </p>
              </div>
              <Link href="/mentors" className="text-sm font-semibold text-brand-accent hover:underline">
                Browse mentors
              </Link>
            </div>
            <div className={`grid gap-3 ${mentors.length > 0 ? "sm:grid-cols-2" : ""}`}>
              <button
                type="button"
                onClick={() => setMentorSlug("")}
                className={`rounded-[5px] border p-4 text-left transition ${
                  mentorSlug === "" ? "border-brand-accent bg-[#f4f7fd]" : "border-brand-ink/10 hover:border-brand-ink/25"
                }`}
              >
                <p className="text-sm font-bold">Match me</p>
                <p className="mt-1 text-xs leading-relaxed text-[#011B33]/55">Any available German speaker on Multivate.</p>
              </button>
              {mentors.map((mentor) => {
                const active = mentorSlug === mentor.slug;
                const place = [mentor.city, mentor.origin_country ? `from ${mentor.origin_country}` : null].filter(Boolean).join(" · ");
                return (
                  <button
                    key={mentor.slug}
                    type="button"
                    onClick={() => setMentorSlug(mentor.slug)}
                    className={`flex gap-3 rounded-[5px] border p-4 text-left transition ${
                      active ? "border-brand-accent bg-[#f4f7fd]" : "border-brand-ink/10 hover:border-brand-ink/25"
                    }`}
                  >
                    <UserAvatar name={mentor.full_name} avatarUrl={mentor.photo_url} className="h-12 w-12 text-sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{mentor.full_name}</span>
                      {mentor.headline ? <span className="mt-0.5 block line-clamp-2 text-xs text-[#011B33]/55">{mentor.headline}</span> : null}
                      {place ? <span className="mt-1 block truncate text-[11px] text-[#011B33]/45">{place}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-extrabold">Session type</h2>
            <p className="mt-1 text-sm text-[#011B33]/55">Prices are per 45-minute hour.</p>
            <ul className="mt-4 divide-y divide-brand-ink/10 overflow-hidden rounded-[5px] border border-brand-ink/10">
              {tiers.map((row) => {
                const active = tier === row.tier;
                return (
                  <li key={row.tier}>
                    <button
                      type="button"
                      onClick={() => setTier(row.tier)}
                      className={`flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition ${
                        active ? "bg-[#f4f7fd]" : "bg-white hover:bg-[#f8f9fb]"
                      }`}
                    >
                      <span>
                        <span className="flex items-center gap-2">
                          <span
                            className={`mt-0.5 inline-block h-3.5 w-3.5 rounded-full border ${
                              active ? "border-brand-accent bg-brand-accent" : "border-brand-ink/25 bg-white"
                            }`}
                            aria-hidden
                          />
                          <span className="text-sm font-bold">{row.label}</span>
                        </span>
                        <span className="mt-1 block pl-[1.375rem] text-xs leading-relaxed text-[#011B33]/55">{row.description}</span>
                      </span>
                      <span className="shrink-0 text-sm font-extrabold text-brand-accent">{money(row.amount_cents, row.currency)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-extrabold">How long?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setHours(n)}
                  className={`h-10 rounded-[5px] px-4 text-sm font-semibold ${
                    hours === n ? "bg-brand-accent text-white" : "border border-brand-ink/15 text-[#011B33] hover:border-brand-ink/30"
                  }`}
                >
                  {n} × 45 min
                </button>
              ))}
            </div>
            <label className="mt-6 block">
              <span className="text-sm font-semibold">Preferred times</span>
              <span className="ml-1 text-sm font-normal text-[#011B33]/45">(optional)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Weekday evenings WAT, or Saturday morning"
                className="mt-1.5 w-full rounded-[5px] border border-brand-ink/15 px-3 py-2.5 text-sm outline-none focus:border-brand-accent"
              />
            </label>
          </section>
        </div>

        <aside className="rounded-[5px] border border-brand-ink/10 bg-[#f6f8fb] p-5 lg:sticky lg:top-24">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">Your booking</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[#011B33]/55">Mentor</span>
              <span className="max-w-[12rem] text-right font-semibold">{selectedMentor?.full_name ?? "Any available speaker"}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[#011B33]/55">Type</span>
              <span className="text-right font-semibold">{selectedTier?.label ?? "-"}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[#011B33]/55">Time</span>
              <span className="text-right font-semibold">{hours} × 45 min</span>
            </div>
            {courseSlug ? (
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#011B33]/55">Course</span>
                <span className="max-w-[12rem] truncate text-right font-semibold">{courseSlug}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-5 border-t border-brand-ink/10 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[#011B33]/55">Total</span>
              <span className="text-xl font-extrabold">{money(totalCents, selectedTier?.currency ?? "NGN")}</span>
            </div>
          </div>

          {err ? <p className="mt-4 text-sm font-medium text-red-700">{err}</p> : null}

          {!payStep ? (
            <button
              type="button"
              disabled={busy || !selectedTier}
              onClick={() => void start()}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-brand-accent text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue to payment
            </button>
          ) : (
            <div className="mt-5 space-y-4 rounded-[5px] border border-brand-ink/10 bg-white p-4">
              {data?.message ? <p className="text-sm text-[#011B33]/70">{data.message}</p> : null}
              {data?.instructions ? (
                <>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#011B33]/45">Bank</dt>
                      <dd className="font-semibold">{data.instructions.bank_name}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#011B33]/45">Account</dt>
                      <dd className="text-right font-semibold">{data.instructions.account_name}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#011B33]/45">Number</dt>
                      <dd className="font-semibold">{data.instructions.account_number}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#011B33]/45">Amount</dt>
                      <dd className="font-semibold">{money(data.instructions.amount_cents, data.instructions.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#011B33]/45">Reference</dt>
                      <dd className="mt-1 flex items-center justify-between gap-2 font-semibold">
                        <span className="break-all">{data.instructions.payment_reference}</span>
                        <button
                          type="button"
                          className="shrink-0 text-brand-accent"
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
                  <input
                    value={txnRef}
                    onChange={(event) => setTxnRef(event.target.value)}
                    placeholder="Bank transaction reference"
                    className="h-10 w-full rounded-[5px] border border-brand-ink/15 px-3 text-sm outline-none focus:border-brand-accent"
                  />
                  <input
                    value={amountSent}
                    onChange={(event) => setAmountSent(event.target.value)}
                    placeholder="Amount sent"
                    className="h-10 w-full rounded-[5px] border border-brand-ink/15 px-3 text-sm outline-none focus:border-brand-accent"
                  />
                  <button
                    type="button"
                    disabled={verifyBusy || !txnRef.trim()}
                    onClick={() => void claimTransfer()}
                    className="inline-flex h-11 w-full items-center justify-center rounded-[5px] bg-brand-accent text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {verifyBusy ? "Submitting…" : "I have paid"}
                  </button>
                </>
              ) : (
                <p className="text-sm text-[#011B33]/60">Opening the payment page…</p>
              )}
            </div>
          )}
        </aside>
      </div>

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
