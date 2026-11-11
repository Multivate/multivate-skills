"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { VisitorGeo } from "@/lib/visitor-geo";

const VisitorGeoContext = createContext<VisitorGeo | null>(null);

export function VisitorGeoProvider({ children }: { children: ReactNode }) {
  const [geo, setGeo] = useState<VisitorGeo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/geo", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as VisitorGeo;
        if (cancelled) return;
        if (typeof data?.country_code === "string" && typeof data.in_nigeria === "boolean") {
          setGeo(data);
        }
      } catch {
        /* keep Nigeria defaults until we know otherwise */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => geo, [geo]);
  return <VisitorGeoContext.Provider value={value}>{children}</VisitorGeoContext.Provider>;
}

export function useVisitorGeo(): VisitorGeo | null {
  return useContext(VisitorGeoContext);
}
