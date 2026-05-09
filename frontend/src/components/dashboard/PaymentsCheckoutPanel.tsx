"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import {
  checkoutAmountCentsForSlug,
  checkoutDisplayPriceForSlug,
} from "@/lib/checkout-pricing";

type CoursePreview = { slug: string; title: string; description: string };

export function PaymentsCheckoutPanel() {
  const t = useTranslations("dashboard.paymentsCheckout");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { removeItem } = useCart();
  const slug = (searchParams.get("checkout") ?? "").trim();
  const [course, setCourse] = useState<CoursePreview | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const displayPrice = checkoutDisplayPriceForSlug(slug);

  const loadCourse = useCallback(async () => {
    if (!slug) return;
    setLoadErr(null);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { slug?: string; title?: string; description?: string };
        setCourse({
          slug: data.slug ?? slug,
          title: typeof data.title === "string" ? data.title : slug,
          description: typeof data.description === "string" ? data.description : "",
        });
        return;
      }
      setCourse({ slug, title: slug, description: "" });
    } catch {
      setLoadErr(t("loadCourseError"));
      setCourse({ slug, title: slug, description: "" });
    }
  }, [slug, t]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  if (!slug) return null;

  if (authLoading) {
    return (
      <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
        <p className="text-sm text-slate-600">{t("checkingSession")}</p>
      </section>
    );
  }

  if (!user || user.role !== "student") {
    return (
      <section className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-6 dark:border-amber-900/50 dark:bg-amber-950/30">
        <h2 className="text-lg font-extrabold text-brand-ink">{t("studentOnlyTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{t("studentOnlyBody")}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-brand-primary hover:underline">
          {t("backDashboard")}
        </Link>
      </section>
    );
  }

  async function payAndEnroll() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_slug: slug,
          amount_cents: checkoutAmountCentsForSlug(slug),
          currency: "USD",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          data && typeof data === "object" && "detail" in data
            ? typeof (data as { detail: unknown }).detail === "string"
              ? (data as { detail: string }).detail
              : JSON.stringify((data as { detail: unknown }).detail)
            : t("payError");
        setErr(detail);
        return;
      }
      removeItem(slug);
      router.replace("/dashboard/payments");
      router.refresh();
    } catch {
      setErr(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-10 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800/90 dark:bg-slate-900 sm:p-8">
      <h2 className="text-lg font-extrabold tracking-tight text-brand-ink">{t("title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("subtitle")}</p>
      {loadErr ? <p className="mt-2 text-xs text-amber-800">{loadErr}</p> : null}
      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("courseLabel")}</p>
        <p className="mt-1 font-bold text-brand-ink">{course?.title ?? slug}</p>
        {course?.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{course.description}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">{t("priceLabel")}</p>
            <p className="mt-1 text-sm text-slate-600">
              {t("displayPrice", { price: displayPrice })}{" "}
              <span className="text-xs text-slate-500">({t("chargedNote")})</span>
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void payAndEnroll()}
            className="btn-primary-brand !px-6 !py-2.5 text-sm disabled:opacity-60"
          >
            {busy ? t("processing") : t("payCta")}
          </button>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">{t("gatewayNote")}</p>
      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {err}
        </p>
      ) : null}
    </section>
  );
}
