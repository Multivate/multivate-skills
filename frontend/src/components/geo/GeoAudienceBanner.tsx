"use client";

import { useVisitorGeo } from "@/contexts/visitor-geo-context";

export function GeoAudienceBanner() {
  const geo = useVisitorGeo();
  if (!geo || geo.in_nigeria || !geo.warning) return null;
  return (
    <div
      role="status"
      className="bg-[#1457D0] px-4 py-2.5 text-center text-[13px] leading-snug text-white sm:text-sm"
    >
      {geo.warning}
    </div>
  );
}
