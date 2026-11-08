"use client";

import { StudentSurface } from "@/components/dashboard/StudentPageHero";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_reference?: string | null;
  course_title?: string | null;
  created_at: string;
  paid_at?: string | null;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function statusLabel(status: string) {
  if (status === "awaiting_review") return "Awaiting approval";
  if (status === "pending") return "Pending";
  if (status === "failed") return "Failed";
  return "Paid";
}

export default function PurchaseHistoryPage() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payments/me", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof data?.detail === "string" ? data.detail : "We couldn't load purchase history.");
          setRows([]);
          return;
        }
        setRows(Array.isArray(data) ? (data as PaymentRow[]) : []);
      } catch {
        if (!cancelled) {
          setError("Connection problem. Please try again.");
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StudentSurface>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[#011B33]/50">Account</p>
        <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">Purchase history</h1>
        <p className="mt-2 text-sm text-[#011B33]/60">Courses and mentor sessions paid from this account.</p>

        {rows === null ? <p className="mt-8 text-sm text-[#6a6f73]">Loading…</p> : null}
        {error ? <p className="mt-8 text-sm text-red-700">{error}</p> : null}

        {rows && rows.length === 0 && !error ? (
          <div className="mt-8 rounded-[5px] border border-dashed border-brand-ink/20 px-6 py-12 text-center">
            <p className="font-semibold">No purchases yet.</p>
            <Link href="/courses" className="mt-4 inline-block text-sm font-semibold text-brand-accent hover:underline">
              Browse courses
            </Link>
          </div>
        ) : null}

        {rows && rows.length > 0 ? (
          <ul className="mt-8 divide-y divide-brand-ink/10 overflow-hidden rounded-[5px] border border-brand-ink/10">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-semibold">{row.course_title || "Purchase"}</p>
                  {row.payment_reference ? (
                    <p className="mt-1 font-mono text-xs text-[#011B33]/50">{row.payment_reference}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#011B33]/50">{new Date(row.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold tabular-nums">{money(row.amount_cents, row.currency)}</p>
                  <p className="mt-1 text-xs font-semibold text-[#011B33]/55">{statusLabel(row.status)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </StudentSurface>
  );
}
