"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { BankTransferCheckoutPanel } from "@/components/dashboard/BankTransferCheckoutPanel";
import { StudentPageHero, StudentSurface } from "@/components/dashboard/StudentPageHero";
import { useAuth } from "@/contexts/auth-context";
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
    return <p className="admin-muted text-sm">{t("loading")}</p>;
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
      <li className="rounded border border-[#d1d7dc] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold">{p.course_title ?? "Course"}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money(p.amount_cents, p.currency)}</p>
            {p.payment_reference ? (
              <p className="admin-muted mt-1 font-mono text-xs">{p.payment_reference}</p>
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
        <p className="admin-muted mt-2 text-xs">{new Date(p.created_at).toLocaleString()}</p>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}

      {outstanding.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{t("outstandingTitle")}</h2>
            <p className="admin-muted mt-1 text-sm">{t("outstandingHint")}</p>
          </div>
          <ul className="space-y-3">
            {outstanding.map((p) => (
              <PaymentCard key={p.id} p={p} locked />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("historyTitle")}</h2>
        {rows.length === 0 ? (
          <div className="rounded border border-[#d1d7dc] px-6 py-12 text-center">
            <p className="admin-muted text-sm">{t("empty")}</p>
          </div>
        ) : history.length === 0 ? (
          <p className="admin-muted text-sm">No completed payments yet.</p>
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
  const { user } = useAuth();
  const desk = user?.role === "instructor" || user?.role === "mentor";

  return (
    <>
      {desk ? null : <StudentPageHero title={t("title")} subtitle={t("intro")} />}
      <StudentSurface>
        <div className="space-y-6">
          {desk ? (
            <header>
              <p className="text-sm text-[#011B33]/50">Account</p>
              <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">{t("title")}</h1>
              <p className="mt-2 text-sm text-[#011B33]/60">{t("intro")}</p>
            </header>
          ) : null}
          <Suspense
            fallback={
              <section className="rounded border border-[#d1d7dc] p-6">
                <p className="text-sm text-[#6a6f73]">{t("loadingCheckout")}</p>
              </section>
            }
          >
            <BankTransferCheckoutPanel />
          </Suspense>
          <PaymentsHistory />
        </div>
      </StudentSurface>
    </>
  );
}
