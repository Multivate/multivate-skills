"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const t = useTranslations("dashboard.bankTransferSuccess");

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
