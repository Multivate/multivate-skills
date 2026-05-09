"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/auth-context";

type Props = {
  courseSlug: string;
};

export function CourseEnrollCta({ courseSlug }: Props) {
  const t = useTranslations("courseEnroll");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  function goToCheckout() {
    if (!user) {
      router.push(`/login?from=${encodeURIComponent(`/courses/${courseSlug}`)}`);
      return;
    }
    router.push(`/dashboard/payments?checkout=${encodeURIComponent(courseSlug)}`);
  }

  if (authLoading) {
    return (
      <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40">
        {t("checkingSession")}
      </div>
    );
  }

  if (user && user.role !== "student") {
    return (
      <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
        <p className="text-sm font-semibold text-brand-ink dark:text-slate-100">{t("studentOnlyTitle")}</p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("studentOnlyBody")}</p>
        <Link
          href="/dashboard"
          className="inline-block text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
        >
          {t("studentOnlyDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <button type="button" onClick={goToCheckout} className="btn-primary-brand block w-full text-center !py-3">
        {t("enrollCta")}
      </button>
      <p className="text-center text-xs text-slate-500">{t("paymentNote")}</p>
      <Link href="/register" className="block text-center text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
        {t("needAccount")}
      </Link>
    </div>
  );
}
