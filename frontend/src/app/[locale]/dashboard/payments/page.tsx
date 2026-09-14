"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { BankTransferCheckoutPanel } from "@/components/dashboard/BankTransferCheckoutPanel";
import { Clock3, Lock, CheckCircle2, XCircle } from "lucide-react";

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

function money(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

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

  const outstanding = useMemo(
    () => (rows ?? []).filter((p) => p.status === "pending" || p.status === "awaiting_review"),
    [rows],
  );
  const history = useMemo(
    () => (rows ?? []).filter((p) => p.status !== "pending" && p.status !== "awaiting_review"),
    [rows],
  );

  if (rows === null) {
    return <p className="text-sm text-brand-ink/55">{t("loading")}</p>;
  }

  function statusMeta(status: string) {
    if (status === "awaiting_review") {
      return {
        label: t("statusAwaiting"),
        className: "bg-amber-100 text-amber-950",
        icon: <Clock3 className="h-3.5 w-3.5" />,
      };
    }
    if (status === "pending") {
      return {
        label: t("statusPending"),
        className: "bg-brand-muted text-brand-ink/70",
        icon: <Lock className="h-3.5 w-3.5" />,
      };
    }
    if (status === "failed") {
      return {
        label: t("statusFailed"),
        className: "bg-red-100 text-red-800",
        icon: <XCircle className="h-3.5 w-3.5" />,
      };
    }
    return {
      label: t("statusPaid"),
      className: "bg-emerald-100 text-emerald-800",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    };
  }

  function PaymentCard({ p, locked }: { p: PaymentRow; locked?: boolean }) {
    const meta = statusMeta(p.status);
    return (
      <li className="rounded-2xl border border-brand-ink/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-display text-base font-bold text-brand-ink">{p.course_title ?? "Course"}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-brand-ink">{money(p.amount_cents, p.currency)}</p>
            {p.payment_reference ? (
              <p className="mt-1 font-mono text-xs text-brand-ink/50">{p.payment_reference}</p>
            ) : null}
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase ${meta.className}`}>
            {meta.icon}
            {meta.label}
          </span>
        </div>
        {locked ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <Lock className="h-3.5 w-3.5" />
            {t("accessLocked")}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-brand-ink/45">{new Date(p.created_at).toLocaleString()}</p>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}

      {outstanding.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-bold text-brand-ink">{t("outstandingTitle")}</h2>
            <p className="mt-1 text-sm text-brand-ink/55">{t("outstandingHint")}</p>
          </div>
          <ul className="space-y-3">
            {outstanding.map((p) => (
              <PaymentCard key={p.id} p={p} locked />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-brand-ink">{t("historyTitle")}</h2>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-ink/15 bg-brand-muted/40 px-6 py-12 text-center">
            <p className="text-sm text-brand-ink/55">{t("empty")}</p>
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-brand-ink/50">No completed payments yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((p) => (
              <PaymentCard key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function DashboardPaymentsPage() {
  const t = useTranslations("dashboard.studentPayments");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink/60">{t("intro")}</p>
      </header>

      <Suspense
        fallback={
          <section className="rounded-2xl border border-brand-ink/10 bg-white p-6">
            <p className="text-sm text-brand-ink/55">{t("loadingCheckout")}</p>
          </section>
        }
      >
        <BankTransferCheckoutPanel />
      </Suspense>

      <PaymentsHistory />

      <Link href="/dashboard" className="inline-block text-sm font-semibold text-brand-accent hover:underline">
        {t("back")}
      </Link>
    </div>
  );
}
