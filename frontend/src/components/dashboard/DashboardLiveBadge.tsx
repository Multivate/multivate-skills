"use client";

export function DashboardLiveBadge({ lastUpdated }: { lastUpdated?: Date | null }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" aria-hidden />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      </span>
      Live
      {lastUpdated ? (
        <span className="font-normal text-emerald-700/80">· {lastUpdated.toLocaleTimeString()}</span>
      ) : null}
    </div>
  );
}
