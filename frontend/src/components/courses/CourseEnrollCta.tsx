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
      <div className="rounded-md border border-brand-ink/10 bg-brand-muted/40 px-4 py-4 text-center text-sm text-brand-ink/60">
        {t("checkingSession")}
      </div>
    );
  }

  if (user && user.role !== "student") {
    return (
      <div className="space-y-3 rounded-md border border-brand-ink/10 bg-brand-muted/40 px-4 py-4">
        <p className="text-sm font-semibold text-brand-ink">{t("studentOnlyTitle")}</p>
        <p className="text-sm leading-relaxed text-brand-ink/60">{t("studentOnlyBody")}</p>
        <Link href="/dashboard" className="inline-block text-sm font-semibold text-brand-accent hover:text-brand-accent-dark">
          {t("studentOnlyDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={goToCheckout} className="btn-cta-accent block w-full text-center !py-3.5">
        {t("enrollCta")}
      </button>
      <p className="text-center text-xs leading-relaxed text-brand-ink/50">{t("paymentNote")}</p>
      {!user ? (
        <Link href="/register" className="block text-center text-sm font-semibold text-brand-accent hover:text-brand-accent-dark">
          {t("needAccount")}
        </Link>
      ) : null}
    </div>
  );
}
