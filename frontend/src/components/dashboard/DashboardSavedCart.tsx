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
      <section id="saved-cart" className="scroll-mt-24 rounded border border-[#d1d7dc] px-5 py-6">
        <h2 className="text-base font-bold">{t("cartTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#6a6f73]">{t("cartEmpty")}</p>
        <Link href="/courses" className="mt-4 inline-flex text-sm font-bold text-[#1457D0]">
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
    <section id="saved-cart" className="scroll-mt-24 rounded border border-[#d1d7dc] p-5 sm:p-6">
      <h2 className="text-base font-bold">{t("cartTitle")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-[#6a6f73]">{t("cartBody")}</p>
      <ul className="mt-5 space-y-3">
        {items.map((line) => (
          <li key={line.slug} className="flex flex-col gap-4 rounded border border-[#d1d7dc] p-4 sm:flex-row sm:items-center">
            <Link href={`/courses/${line.slug}`} className="relative h-20 w-full shrink-0 overflow-hidden bg-[#f7f9fa] sm:h-16 sm:w-28">
              <Image src={line.image} alt="" fill className="object-cover" sizes="112px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/courses/${line.slug}`} className="font-semibold hover:text-[#1457D0]">
                {line.title}
              </Link>
              <p className="admin-muted mt-1 text-xs font-semibold uppercase tracking-wide">{t("badgeLive")}</p>
              {line.priceLabel ? <p className="mt-1 text-sm font-semibold">{line.priceLabel}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => removeItem(line.slug)}
                className="rounded-lg border border-[var(--admin-line)] px-4 py-2 text-sm font-semibold"
              >
                {t("remove")}
              </button>
              {authLoading ? (
                <span className="admin-muted inline-flex items-center px-4 py-2 text-sm">{t("checkingSession")}</span>
              ) : !user ? (
                <Link href={`/login?from=${encodeURIComponent("/dashboard/courses")}`} className="inline-flex rounded-lg bg-[#1457D0] px-4 py-2 text-sm font-semibold text-white">
                  {t("signInToEnroll")}
                </Link>
              ) : user.role !== "student" ? null : (
                <button type="button" onClick={() => goPay(line.slug)} className="rounded-lg bg-[#1457D0] px-4 py-2 text-sm font-semibold text-white">
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
