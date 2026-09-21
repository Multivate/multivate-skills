"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { CheckCircle2, Clock3, Lock, XCircle } from "lucide-react";

type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  user_email?: string;
  user_name?: string | null;
  student_code?: string | null;
  payment_reference?: string | null;
  transaction_reference?: string | null;
  payment_method?: string;
  course_slug: string | null;
  course_title: string | null;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function AdminPaymentsPanel() {
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"outstanding" | "all">("outstanding");

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/payments?limit=100", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(readApiError(data, "We couldn't load payments."));
      setPayments([]);
      return;
    }
    setPayments(Array.isArray(data) ? (data as PaymentRow[]) : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const outstanding = useMemo(
    () => (payments ?? []).filter((p) => p.status === "awaiting_review" || p.status === "pending"),
    [payments],
  );
  const visible = filter === "outstanding" ? outstanding : payments ?? [];

  async function approve(p: PaymentRow) {
    setMsg(null);
    const raw = (amountDraft[p.id] ?? "").trim();
    const major = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(major) || major < 0) {
      setMsg("Enter the exact amount you received in the bank before approving.");
      return;
    }
    const amountReceivedCents = Math.round(major * 100);
    if (amountReceivedCents !== p.amount_cents) {
      setMsg(
        `Amount does not match. Invoice is ${money(p.amount_cents, p.currency)}. Wrong amounts cannot be approved.`,
      );
      return;
    }

    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(p.id)}/approve`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_received_cents: amountReceivedCents,
          transaction_reference: p.transaction_reference || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(readApiError(data, "We couldn't approve that payment. Please try again."));
        return;
      }
      setMsg("Payment approved. The student is now enrolled and can access the course.");
      setAmountDraft((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      await load();
    } catch {
      setMsg("Connection problem. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(p: PaymentRow) {
    setMsg(null);
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(p.id)}/reject`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "We could not match this transfer to the expected amount." }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(readApiError(data, "We couldn't reject that payment. Please try again."));
        return;
      }
      setMsg("Payment rejected. Course access stays locked.");
      await load();
    } catch {
      setMsg("Connection problem. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (err && payments === null) return <p className="text-sm text-red-800">{err}</p>;
  if (payments === null) return <p className="text-sm text-brand-ink/55">Loading payments…</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-brand-ink/10 bg-brand-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-brand-ink">Payment review</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-brand-ink/60">
              Approve only when the bank amount matches the invoice.
            </p>
          </div>
          <div className="flex rounded-md border border-brand-ink/10 bg-brand-muted/60 p-1">
            <button
              type="button"
              onClick={() => setFilter("outstanding")}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
                filter === "outstanding" ? "bg-brand-surface text-brand-ink shadow-sm" : "text-brand-ink/50"
              }`}
            >
              Outstanding ({outstanding.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-sm px-3 py-1.5 text-xs font-semibold transition ${
                filter === "all" ? "bg-brand-surface text-brand-ink shadow-sm" : "text-brand-ink/50"
              }`}
            >
              All
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-amber-800/70">Awaiting review</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-950">
              {payments.filter((p) => p.status === "awaiting_review").length}
            </p>
          </div>
          <div className="rounded-md border border-brand-ink/10 bg-brand-muted/50 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">Pending checkout</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-ink">
              {payments.filter((p) => p.status === "pending").length}
            </p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-800/70">Paid</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">
              {payments.filter((p) => p.status === "paid" || p.status === "completed").length}
            </p>
          </div>
        </div>
      </div>

      {msg ? (
        <p
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            msg.startsWith("Payment approved")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : msg.startsWith("Payment rejected")
                ? "border border-amber-200 bg-amber-50 text-amber-950"
                : "border border-red-200 bg-red-50 text-red-900"
          }`}
          role="status"
        >
          {msg}
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-800">{err}</p> : null}

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-brand-ink/15 bg-brand-muted/30 px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-brand-ink/30" />
          <p className="mt-3 text-sm text-brand-ink/55">
            {filter === "outstanding" ? "No outstanding payments right now." : "No payments yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((p) => {
            const canApprove = p.status === "awaiting_review";
            const isPending = p.status === "pending";
            return (
              <li key={p.id} className="rounded-md border border-brand-ink/10 bg-brand-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-brand-ink">
                      {p.course_title ?? "Course"}
                    </p>
                    <p className="mt-1 text-sm text-brand-ink/60">
                      {p.user_name ? `${p.user_name} · ` : ""}
                      {p.user_email ?? "Student"}
                      {p.student_code ? ` · ${p.student_code}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ${
                      canApprove
                        ? "bg-amber-100 text-amber-900"
                        : p.status === "paid" || p.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-brand-muted text-brand-ink/60"
                    }`}
                  >
                    {canApprove ? <Clock3 className="h-3.5 w-3.5" /> : null}
                    {isPending ? <Lock className="h-3.5 w-3.5" /> : null}
                    {statusLabel(p.status)}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brand-ink/40">Invoice</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums text-brand-ink">
                      {money(p.amount_cents, p.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brand-ink/40">
                      Payment ref
                    </dt>
                    <dd className="mt-1 font-mono text-xs text-brand-ink">{p.payment_reference ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brand-ink/40">
                      Bank / RRR txn
                    </dt>
                    <dd className="mt-1 font-mono text-xs text-brand-ink">{p.transaction_reference ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brand-ink/40">Submitted</dt>
                    <dd className="mt-1 text-xs text-brand-ink/70">{new Date(p.created_at).toLocaleString()}</dd>
                  </div>
                </dl>

                {canApprove ? (
                  <div className="mt-5 flex flex-col gap-3 border-t border-brand-ink/10 pt-4 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1 text-sm font-semibold text-brand-ink">
                      Amount received in bank ({p.currency})
                      <input
                        inputMode="decimal"
                        value={amountDraft[p.id] ?? ""}
                        onChange={(e) =>
                          setAmountDraft((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        placeholder={(p.amount_cents / 100).toFixed(2)}
                        className="mt-1.5 w-full rounded-md border border-brand-ink/15 bg-brand-paper px-3 py-2.5 text-sm outline-none ring-brand-accent/25 focus:border-brand-accent focus:ring-2"
                      />
                      <span className="mt-1 block text-xs font-normal text-brand-ink/45">
                        Must equal {money(p.amount_cents, p.currency)} exactly.
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void approve(p)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-accent-dark disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {busyId === p.id ? "Saving…" : "Approve & enroll"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void reject(p)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : isPending ? (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand-muted/60 px-3 py-2 text-xs text-brand-ink/60">
                    <Lock className="h-3.5 w-3.5" />
                    Waiting for the student to finish checkout or submit a bank claim. Do not approve yet.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
