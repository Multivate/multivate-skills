"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/lib/cart-types";
import { CART_STORAGE_KEY } from "@/lib/cart-types";

type CartContextValue = {
  items: CartLine[];
  count: number;
  addItem: (item: CartLine) => void;
  removeItem: (slug: string) => void;
  clear: () => void;
  hasSlug: (slug: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is CartLine =>
        x &&
        typeof x === "object" &&
        typeof (x as CartLine).slug === "string" &&
        typeof (x as CartLine).title === "string" &&
        typeof (x as CartLine).image === "string" &&
        ((x as CartLine).source === "live" || (x as CartLine).source === "catalog"),
    );
  } catch {
    return [];
  }
}

function writeStorage(items: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(items);
    window.dispatchEvent(new CustomEvent("multivate-cart"));
  }, [items, hydrated]);

  const addItem = useCallback((item: CartLine) => {
    setItems((prev) => {
      if (prev.some((p) => p.slug === item.slug)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((slug: string) => {
    setItems((prev) => prev.filter((p) => p.slug !== slug));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const hasSlug = useCallback((slug: string) => items.some((p) => p.slug === slug), [items]);

  const count = items.length;

  const value = useMemo(
    () => ({ items, count, addItem, removeItem, clear, hasSlug }),
    [items, count, addItem, removeItem, clear, hasSlug],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
