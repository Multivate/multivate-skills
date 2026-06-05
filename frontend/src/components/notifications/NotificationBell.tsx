"use client";

import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link_href: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastLoadedAt = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listRes = await fetch("/api/notifications/me", { credentials: "include", cache: "no-store" });
      const list = await listRes.json().catch(() => []);
      if (listRes.ok && Array.isArray(list)) {
        const rows = list as NotificationRow[];
        setItems(rows);
        setUnread(rows.filter((n) => !n.read_at).length);
        lastLoadedAt.current = Date.now();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, 90000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && Date.now() - lastLoadedAt.current > 15000) void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
        aria-label={label}
        aria-expanded={open}
      >
        <Bell className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-bold text-brand-ink dark:text-slate-100">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-brand-secondary hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">You are all caught up.</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div
                    className={`border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${
                      n.read_at ? "opacity-75" : "bg-brand-secondary/5"
                    }`}
                  >
                    <p className="text-sm font-bold text-brand-ink dark:text-slate-100">{n.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{n.body}</p>
                    <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                );
                if (n.link_href) {
                  return (
                    <Link
                      key={n.id}
                      href={n.link_href}
                      onClick={() => {
                        if (!n.read_at) void markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      {inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      if (!n.read_at) void markRead(n.id);
                    }}
                  >
                    {inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
