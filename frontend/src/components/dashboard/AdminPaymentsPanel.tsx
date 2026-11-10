"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DonutChart } from "@/components/dashboard/admin-analytics-charts";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { readApiError } from "@/lib/api-error";
import { CheckCircle2, Lock, XCircle } from "lucide-react";

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
  const statusSegments = useMemo(() => {
    const defs = [
      { label: "Awaiting review", color: "#E07A2F", match: (status: string) => status === "awaiting_review" },
      { label: "Pending", color: "#E8A317", match: (status: string) => status === "pending" },
      { label: "Paid", color: "#1F8A4C", match: (status: string) => status === "paid" || status === "completed" },
      { label: "Failed", color: "#D64545", match: (status: string) => status === "failed" },
    ];
    return defs
      .map((item) => ({
        label: item.label,
        color: item.color,
        value: (payments ?? []).filter((payment) => item.match(payment.status)).length,
      }))
      .filter((item) => item.value > 0);
  }, [payments]);

  function moneyLine(rows: PaymentRow[]) {
    const totals = new Map<string, number>();
    for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount_cents);
    if (totals.size === 0) return money(0, "NGN");
    return [...totals.entries()].map(([currency, cents]) => money(cents, currency)).join(", ");
  }

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
  if (payments === null) return <p className="admin-muted text-sm">Loading payments…</p>;

  const received = payments.filter((payment) => payment.status === "paid" || payment.status === "completed");
  const open = payments.filter((payment) => payment.status === "awaiting_review" || payment.status === "pending");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="admin-muted max-w-xl text-sm">Approve only when the bank amount matches the invoice.</p>
        <div className="flex rounded-lg border border-[var(--admin-line)] bg-[var(--admin-soft)] p-1">
          <button
            type="button"
            onClick={() => setFilter("outstanding")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              filter === "outstanding" ? "admin-card text-[var(--admin-ink)]" : "admin-muted"
            }`}
          >
            Outstanding ({outstanding.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              filter === "all" ? "admin-card text-[var(--admin-ink)]" : "admin-muted"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {statusSegments.length > 0 ? (
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">By status</h2>
          <p className="admin-muted mt-1 text-xs">
            Received {moneyLine(received)} · Still open {moneyLine(open)}
          </p>
          <div className="mt-4">
            <DonutChart segments={statusSegments} centerLabel={String(payments.length)} />
          </div>
        </section>
      ) : null}

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
        <div className="admin-card rounded-2xl px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-[#1F8A4C]" />
          <p className="admin-muted mt-3 text-sm">
            {filter === "outstanding" ? "No outstanding payments right now." : "No payments yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((p) => {
            const canApprove = p.status === "awaiting_review";
            const isPending = p.status === "pending";
            const pill =
              canApprove
                ? "bg-[#FFF1E4] text-[#C56A1A]"
                : p.status === "paid" || p.status === "completed"
                  ? "bg-[#E5F6EC] text-[#1F8A4C]"
                  : p.status === "failed"
                    ? "bg-[#FDECEC] text-[#C2414A]"
                    : "bg-[#FFF4DE] text-[#A56B00]";
            return (
              <li key={p.id} className="admin-card rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <PersonMark name={p.user_name || p.user_email || "Student"} className="h-10 w-10 text-xs" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{p.course_title ?? "Course"}</p>
                      <p className="admin-muted mt-0.5 truncate text-sm">
                        {p.user_name ? `${p.user_name} · ` : ""}
                        {p.user_email ?? "Student"}
                        {p.student_code ? ` · ${p.student_code}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pill}`}>
                    {isPending ? <Lock className="h-3.5 w-3.5" /> : null}
                    {statusLabel(p.status)}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="admin-muted text-[0.65rem] font-semibold uppercase tracking-[0.12em]">Invoice</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">{money(p.amount_cents, p.currency)}</dd>
                  </div>
                  <div>
                    <dt className="admin-muted text-[0.65rem] font-semibold uppercase tracking-[0.12em]">Payment ref</dt>
                    <dd className="mt-1 font-mono text-xs">{p.payment_reference ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="admin-muted text-[0.65rem] font-semibold uppercase tracking-[0.12em]">Bank / RRR txn</dt>
                    <dd className="mt-1 font-mono text-xs">{p.transaction_reference ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="admin-muted text-[0.65rem] font-semibold uppercase tracking-[0.12em]">Submitted</dt>
                    <dd className="admin-muted mt-1 text-xs">{new Date(p.created_at).toLocaleString()}</dd>
                  </div>
                </dl>

                {canApprove ? (
                  <div className="mt-5 flex flex-col gap-3 border-t border-[var(--admin-line)] pt-4 sm:flex-row sm:items-end">
                    <label className="min-w-0 flex-1 text-sm font-semibold">
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
                        className="mt-1.5 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-bg)] px-3 py-2.5 text-sm outline-none focus:border-[#1457D0] focus:ring-2 focus:ring-[#1457D0]/25"
                      />
                      <span className="admin-muted mt-1 block text-xs font-normal">
                        Must equal {money(p.amount_cents, p.currency)} exactly.
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void approve(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E3F9E] disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {busyId === p.id ? "Saving…" : "Approve & enroll"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void reject(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FDECEC] px-4 py-2.5 text-sm font-semibold text-[#C2414A] transition hover:bg-[#f8d4d4] disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ) : isPending ? (
                  <p className="admin-muted mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--admin-soft)] px-3 py-2 text-xs">
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
