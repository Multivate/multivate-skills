"use client";

import { useEffect, useState } from "react";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { Link } from "@/i18n/navigation";
import { readApiError } from "@/lib/api-error";

type LogRow = {
  id: string;
  source: string;
  action: string;
  detail: string | null;
  actor_name: string | null;
  created_at: string;
};

function timeAgo(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function AdminSystemLogs() {
  const [rows, setRows] = useState<LogRow[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/system-logs?limit=100", { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      if (res.status === 403) {
        setLocked(true);
        setRows([]);
        return;
      }
      if (!res.ok) {
        setErr(readApiError(data, "We couldn't load system logs."));
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) return <p className="text-sm text-red-700">{err}</p>;
  if (rows === null) return <p className="admin-muted text-sm">Loading system logs…</p>;
  if (locked) {
    return (
      <section className="admin-card max-w-xl rounded-2xl p-6">
        <h2 className="text-base font-semibold">System logs are locked</h2>
        <p className="admin-muted mt-2 text-sm">Finish authenticator setup in Security. Course and payment activity opens after that.</p>
        <Link href="/admin/security" className="mt-4 inline-flex rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white no-underline">
          Continue onboarding
        </Link>
      </section>
    );
  }

  return (
    <section className="admin-card overflow-hidden rounded-2xl">
      <div className="px-5 py-4">
        <h2 className="text-base font-semibold">Course and payment activity</h2>
        <p className="admin-muted mt-1 text-xs">{rows.length} event{rows.length === 1 ? "" : "s"}</p>
      </div>
      {rows.length === 0 ? (
        <p className="admin-muted px-5 pb-6 text-sm">No course or payment events yet.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 border-t border-[var(--admin-line)] px-5 py-3 text-sm">
              <PersonMark name={row.actor_name || row.source} className="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.action.replaceAll("_", " ")}</p>
                <p className="admin-muted truncate text-xs">
                  {row.source} · {row.actor_name || "System"}
                  {row.detail ? ` · ${row.detail}` : ""}
                </p>
              </div>
              <span className="admin-muted shrink-0 text-xs">{timeAgo(row.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
