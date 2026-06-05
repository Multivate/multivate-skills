"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { XCircle } from "lucide-react";

export default function PaymentFailedPage() {
  const t = useTranslations("dashboard.bankTransferFailed");

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="rounded-2xl border border-red-200/90 bg-red-50/80 p-10 shadow-sm dark:border-red-900/40 dark:bg-red-950/30">
        <XCircle className="mx-auto h-14 w-14 text-red-600" />
        <h1 className="mt-4 text-2xl font-extrabold text-brand-ink">{t("title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{t("body")}</p>
        <Link href="/dashboard/payments" className="btn-primary-brand mt-8 inline-block !px-6 !py-2.5 text-sm">
          {t("retry")}
        </Link>
      </div>
    </div>
  );
}
