"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";

export function DashboardSavedCart() {
  const t = useTranslations("dashboard.coursesTab");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, removeItem } = useCart();
  if (!authLoading && user && user.role !== "student") {
    return null;
  }

  if (items.length === 0) {
    return (
      <section id="saved-cart" className="scroll-mt-24 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-5 py-8 dark:border-slate-700/90 dark:bg-slate-900/40 sm:px-8">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">{t("cartTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{t("cartEmpty")}</p>
        <Link href="/courses" className="btn-outline-brand mt-5 inline-flex text-sm !py-2.5">
          {t("browseCatalog")}
        </Link>
      </section>
    );
  }

  function goPay(slug: string) {
    if (!user) {
      router.push(`/login?from=${encodeURIComponent("/dashboard/courses")}`);
      return;
    }
    if (user.role !== "student") {
      return;
    }
    router.push(`/dashboard/payments?checkout=${encodeURIComponent(slug)}`);
  }

  return (
    <section id="saved-cart" className="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800/90 dark:bg-slate-900 sm:p-8">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">{t("cartTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{t("cartBody")}</p>
      <ul className="mt-6 space-y-4">
        {items.map((line) => (
          <li
            key={line.slug}
            className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950/50"
          >
            <Link href={`/courses/${line.slug}`} className="relative h-20 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-16 sm:w-28">
              <Image src={line.image} alt="" fill className="object-cover" sizes="112px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/courses/${line.slug}`} className="font-bold text-brand-ink hover:text-brand-primary">
                {line.title}
              </Link>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                {t("badgeLive")}
              </p>
              {line.priceLabel ? <p className="mt-1 text-sm font-bold text-slate-800">{line.priceLabel}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => removeItem(line.slug)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {t("remove")}
              </button>
              {authLoading ? (
                <span className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500">{t("checkingSession")}</span>
              ) : !user ? (
                <Link href={`/login?from=${encodeURIComponent("/dashboard/courses")}`} className="btn-primary-brand inline-flex !py-2 text-sm">
                  {t("signInToEnroll")}
                </Link>
              ) : user.role !== "student" ? null : (
                <button type="button" onClick={() => goPay(line.slug)} className="btn-primary-brand !py-2 text-sm">
                  {t("payAndEnroll")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
