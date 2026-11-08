"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";

export type WishlistCourse = {
  slug: string;
  title: string;
  image_url: string;
  instructor_name?: string | null;
  price_cents?: number;
  currency?: string;
  is_free?: boolean;
};

type WishlistContextValue = {
  items: WishlistCourse[];
  count: number;
  hasSlug: (slug: string) => boolean;
  toggle: (slug: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistCourse[]>([]);

  const refresh = useCallback(async () => {
    if (!user || user.role !== "student") {
      setItems([]);
      return;
    }
    const res = await fetch("/api/learning/wishlist", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) {
      setItems(data as WishlistCourse[]);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasSlug = useCallback((slug: string) => items.some((item) => item.slug === slug), [items]);

  const toggle = useCallback(
    async (slug: string) => {
      const saved = hasSlug(slug);
      const res = await fetch(saved ? `/api/learning/wishlist/${encodeURIComponent(slug)}` : "/api/learning/wishlist", {
        method: saved ? "DELETE" : "POST",
        credentials: "include",
        headers: saved ? undefined : { "Content-Type": "application/json" },
        body: saved ? undefined : JSON.stringify({ course_slug: slug }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setItems(data as WishlistCourse[]);
      }
    },
    [hasSlug],
  );

  const value = useMemo(
    () => ({ items, count: items.length, hasSlug, toggle, refresh }),
    [items, hasSlug, toggle, refresh],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
