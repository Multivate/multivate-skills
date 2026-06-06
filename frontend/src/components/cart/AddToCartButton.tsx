"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import type { CartLine } from "@/lib/cart-types";

type Variant = "primary" | "outline" | "compact";

export function AddToCartButton({
  item,
  variant = "outline",
  className = "",
  studentOnly = true,
  addLabel,
  removeLabel,
}: {
  item: CartLine;
  variant?: Variant;
  className?: string;
  /** When true, hide for signed-in instructors and admins (cart is for learners). */
  studentOnly?: boolean;
  /** Optional explicit label (avoids empty text if translations hydrate late). */
  addLabel?: string;
  removeLabel?: string;
}) {
  const t = useTranslations("cart");
  const addText = addLabel ?? t("add");
  const removeText = removeLabel ?? t("remove");
  const { user } = useAuth();
  const { addItem, hasSlug, removeItem } = useCart();
  const inCart = hasSlug(item.slug);

  if (studentOnly && user && user.role !== "student") {
    return null;
  }

  const base =
    variant === "primary"
      ? "btn-primary-brand inline-flex items-center justify-center gap-2 !py-2.5 text-sm"
      : variant === "compact"
        ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-brand-panel hover:text-brand-primary"
        : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-800 transition hover:border-brand-panel hover:text-brand-primary";

  if (inCart) {
    return (
      <button
        type="button"
        onClick={() => removeItem(item.slug)}
        className={`${base} border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 ${className}`}
      >
        <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
        {removeText}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => addItem(item)}
      className={`${base} ${className}`}
    >
      <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
      {addText}
    </button>
  );
}
