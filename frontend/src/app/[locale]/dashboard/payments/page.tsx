"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { BankTransferCheckoutPanel } from "@/components/dashboard/BankTransferCheckoutPanel";

type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_reference?: string | null;
  transaction_reference?: string | null;
  paid_at?: string | null;
  created_at: string;
  course_id: string | null;
  course_title?: string | null;
};

function PaymentsHistory() {
  const t = useTranslations("dashboard.studentPayments");
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
          setError(t("signIn"));
          setRows([]);
          return;
        }
        if (!res.ok) {
          setError(typeof data?.detail === "string" ? data.detail : t("loadError"));
          setRows([]);
          return;
        }
        setError(null);
        setRows(Array.isArray(data) ? (data as PaymentRow[]) : []);
      } catch {
        if (!cancelled) setError(t("network"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (rows === null) {
    return <p className="text-sm text-slate-600">{t("loading")}</p>;
  }

  return (
    <>
      {error ? (
        <p className="text-sm font-medium text-red-800">{error}</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm leading-relaxed text-slate-600">{t("empty")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800/90 dark:bg-slate-900">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
              <div>
                <span className="font-semibold text-brand-ink">
                  {new Intl.NumberFormat(undefined, { style: "currency", currency: p.currency }).format(p.amount_cents / 100)}
                </span>
                {p.payment_reference ? (
                  <p className="mt-1 font-mono text-xs text-brand-secondary">{p.payment_reference}</p>
                ) : null}
                {p.course_title ? <p className="mt-1 text-xs text-slate-500">{p.course_title}</p> : null}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                  p.status === "paid" || p.status === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : p.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-900"
                }`}
              >
                {p.status}
              </span>
              <span className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function DashboardPaymentsPage() {
  const t = useTranslations("dashboard.studentPayments");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Suspense
        fallback={
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
            <p className="text-sm text-slate-600">{t("loadingCheckout")}</p>
          </section>
        }
      >
        <BankTransferCheckoutPanel />
      </Suspense>

      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("intro")}</p>
      </header>

      <PaymentsHistory />

      <Link href="/dashboard" className="inline-block text-sm font-semibold text-brand-primary hover:underline">
        {t("back")}
      </Link>
    </div>
  );
}
