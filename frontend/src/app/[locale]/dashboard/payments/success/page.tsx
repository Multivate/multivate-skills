"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function PaymentSuccessPage() {
  const t = useTranslations("dashboard.bankTransferSuccess");
  const searchParams = useSearchParams();
  const ref = (searchParams.get("ref") ?? "").trim();
  const isFree = searchParams.get("free") === "1";
  const [checking, setChecking] = useState(Boolean(ref) && !isFree);
  const [confirmed, setConfirmed] = useState(isFree);

  useEffect(() => {
    if (!ref || isFree) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/payments/remita/refresh/${encodeURIComponent(ref)}`, {
          method: "POST",
          credentials: "include",
        });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && body && body.success === true) {
          setConfirmed(true);
          setChecking(false);
          return;
        }
      } catch {
        if (cancelled) return;
      }
      if (attempts < 8) {
        window.setTimeout(() => void poll(), 3000);
      } else {
        setChecking(false);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [ref, isFree]);

  if (checking) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-10 shadow-sm">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-accent" />
          <h1 className="mt-4 text-xl font-extrabold text-brand-ink">{t("checkingTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("checkingBody")}</p>
        </div>
      </div>
    );
  }

  if (!confirmed && ref && !isFree) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-10 shadow-sm">
          <h1 className="text-xl font-extrabold text-brand-ink">{t("pendingTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{t("pendingBody")}</p>
          <Link href="/dashboard/payments" className="btn-primary-brand mt-6 inline-flex !px-6 !py-2.5 text-sm">
            {t("payments")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/80 p-10 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600 animate-[pulse_2s_ease-in-out_1]" />
        <h1 className="mt-4 text-2xl font-extrabold text-brand-ink">{t("title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{t("body")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard/courses" className="btn-primary-brand !px-6 !py-2.5 text-sm">
            {t("myCourses")}
          </Link>
          <Link
            href="/dashboard/payments"
            className="rounded-xl border border-brand-secondary/30 px-6 py-2.5 text-sm font-semibold text-brand-secondary transition hover:bg-brand-secondary/10"
          >
            {t("payments")}
          </Link>
        </div>
      </div>
    </div>
  );
}
