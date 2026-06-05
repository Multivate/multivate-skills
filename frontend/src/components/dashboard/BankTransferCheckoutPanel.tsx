"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { Copy, CheckCircle2, Loader2 } from "lucide-react";

type Instructions = {
  bank_name: string;
  account_name: string;
  account_number: string;
  amount_cents: number;
  currency: string;
  payment_reference: string;
  student_code: string;
  course_title: string;
  course_slug: string;
};

type StartResponse = {
  enrollment_status: string;
  student_code: string;
  payment?: { payment_reference?: string; status?: string; amount_cents?: number; currency?: string };
  instructions?: Instructions;
  message?: string;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function BankTransferCheckoutPanel() {
  const t = useTranslations("dashboard.bankTransfer");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { removeItem } = useCart();
  const slug = (searchParams.get("checkout") ?? "").trim();
  const [data, setData] = useState<StartResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [txnRef, setTxnRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const paymentStatus = data?.payment?.status ?? "";
  const awaitingReview = paymentStatus === "awaiting_review" || submitted;

  const startEnrollment = useCallback(async () => {
    if (!slug) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/enrollments/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_slug: slug }),
      });
      const body = (await res.json().catch(() => null)) as StartResponse & { detail?: string };
      if (!res.ok) {
        setErr(typeof body?.detail === "string" ? body.detail : t("startError"));
        return;
      }
      setData(body);
      if (body.enrollment_status === "enrolled") {
        removeItem(slug);
        router.push("/dashboard/payments/success?free=1");
      }
      if (body.payment?.status === "awaiting_review") {
        setSubmitted(true);
      }
    } catch {
      setErr(t("networkError"));
    } finally {
      setBusy(false);
    }
  }, [slug, t, removeItem, router]);

  useEffect(() => {
    if (slug && user?.role === "student") void startEnrollment();
  }, [slug, user?.role, startEnrollment]);

  async function copyReference(ref: string) {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast(t("copyFailed"));
    }
  }

  async function verifyPayment() {
    const ref = data?.payment?.payment_reference ?? data?.instructions?.payment_reference;
    if (!ref || !txnRef.trim()) {
      setErr(t("txnRequired"));
      return;
    }
    setVerifyBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_reference: ref,
          transaction_reference: txnRef.trim(),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(typeof body?.detail === "string" ? body.detail : t("verifyError"));
        if (res.status >= 500) router.push("/dashboard/payments/failed");
        return;
      }
      setSubmitted(true);
      setData((prev) =>
        prev
          ? {
              ...prev,
              payment: { ...prev.payment, status: "awaiting_review", payment_reference: ref },
              message: typeof body?.message === "string" ? body.message : t("waitingBody"),
            }
          : prev,
      );
      setToast(typeof body?.message === "string" ? body.message : t("waitingTitle"));
    } catch {
      setErr(t("networkError"));
    } finally {
      setVerifyBusy(false);
    }
  }

  if (!slug) return null;

  if (authLoading || (busy && !data)) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
        <Loader2 className="h-5 w-5 animate-spin text-brand-secondary" aria-hidden />
        <p className="text-sm text-slate-600">{t("loading")}</p>
      </section>
    );
  }

  if (!user || user.role !== "student") {
    return (
      <section className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-6 dark:border-amber-900/50 dark:bg-amber-950/30">
        <h2 className="text-lg font-extrabold text-brand-ink">{t("studentOnlyTitle")}</h2>
        <p className="mt-2 text-sm text-slate-700">{t("studentOnlyBody")}</p>
      </section>
    );
  }

  const inst = data?.instructions;
  const ref = inst?.payment_reference ?? data?.payment?.payment_reference ?? "";

  return (
    <section className="space-y-6">
      {toast ? (
        <p className="rounded-lg border border-brand-secondary/30 bg-brand-secondary/10 px-4 py-2 text-sm text-brand-ink">
          {toast}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/90 dark:bg-slate-900 sm:p-8">
        <h2 className="text-lg font-extrabold text-brand-ink">{t("title")}</h2>
        <p className="mt-2 text-sm text-slate-600">{data?.message ?? t("subtitle")}</p>

        {inst ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border-2 border-brand-secondary/40 bg-brand-secondary/5 p-5 transition-shadow hover:shadow-md">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-secondary">{t("referenceLabel")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="font-mono text-xl font-extrabold tracking-wider text-brand-ink">{ref}</p>
                <button
                  type="button"
                  onClick={() => void copyReference(ref)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-secondary/30 px-3 py-1.5 text-xs font-semibold text-brand-secondary transition hover:bg-brand-secondary/10 active:scale-95"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t("copied") : t("copyRef")}
                </button>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">{t("referenceHint")}</p>
            </div>

            <dl className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{t("bankName")}</dt>
                <dd className="mt-1 font-semibold text-brand-ink">{inst.bank_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{t("accountName")}</dt>
                <dd className="mt-1 font-semibold text-brand-ink">{inst.account_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{t("accountNumber")}</dt>
                <dd className="mt-1 font-mono font-semibold text-brand-ink">{inst.account_number}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{t("amount")}</dt>
                <dd className="mt-1 text-lg font-extrabold text-brand-ink">
                  {formatMoney(inst.amount_cents, inst.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{t("studentId")}</dt>
                <dd className="mt-1 font-mono text-brand-ink">{inst.student_code}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">{t("course")}</dt>
                <dd className="mt-1 font-semibold text-brand-ink">{inst.course_title}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {awaitingReview ? (
          <div className="mt-6 rounded-xl border border-brand-secondary/40 bg-brand-secondary/10 p-5">
            <p className="text-sm font-bold text-brand-ink">{t("waitingTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{t("waitingBody")}</p>
            <Link
              href="/dashboard/payments"
              className="mt-4 inline-flex text-sm font-semibold text-brand-primary hover:underline"
            >
              {t("viewPayments")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <label htmlFor="txn-ref" className="text-sm font-semibold text-brand-ink">
              {t("txnLabel")}
            </label>
            <p className="mt-1 text-xs text-slate-500">{t("txnHint")}</p>
            <input
              id="txn-ref"
              value={txnRef}
              onChange={(e) => setTxnRef(e.target.value)}
              placeholder={t("txnPlaceholder")}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-secondary/30 transition focus:border-brand-secondary focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              disabled={verifyBusy || !ref}
              onClick={() => void verifyPayment()}
              className="btn-primary-brand mt-4 !px-6 !py-2.5 text-sm disabled:opacity-60"
            >
              {verifyBusy ? t("submitting") : t("verifyCta")}
            </button>
          </div>
        )}

        {err ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {err}
          </p>
        ) : null}
      </div>

      <Link href="/dashboard/courses" className="inline-block text-sm font-semibold text-brand-primary hover:underline">
        {t("backCourses")}
      </Link>
    </section>
  );
}
