"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  course_id: string | null;
};

export default function DashboardPaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payments/me", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 401) {
          setError("Sign in to view payments.");
          setRows([]);
          return;
        }
        if (!res.ok) {
          setError(typeof data?.detail === "string" ? data.detail : "Could not load payments.");
          setRows([]);
          return;
        }
        setError(null);
        setRows(Array.isArray(data) ? (data as PaymentRow[]) : []);
      } catch {
        if (!cancelled) setError("Network error.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows === null) {
    return <p className="text-sm text-slate-600">Loading payments…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold text-brand-ink sm:text-xl">Payments</h1>
        <p className="mt-1 text-sm text-slate-600">Records from the Multivate billing API.</p>
      </div>
      {error ? (
        <p className="text-sm text-red-800">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">No payment records on your account yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-semibold text-brand-ink">
                {new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency }).format(p.amount_cents / 100)}
              </span>
              <span className="text-xs font-bold uppercase text-slate-600">{p.status}</span>
              <span className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/dashboard" className="inline-block text-sm font-semibold text-brand-primary hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
