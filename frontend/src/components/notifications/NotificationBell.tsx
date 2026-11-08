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

export function NotificationBell({ label, buttonClassName }: { label: string; buttonClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastLoadedAt = useRef(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        fetch("/api/notifications/me", { credentials: "include", cache: "no-store" }),
        fetch("/api/notifications/me/unread-count", { credentials: "include", cache: "no-store" }),
      ]);
      const list = await listRes.json().catch(() => []);
      if (listRes.ok && Array.isArray(list)) {
        setItems(list as NotificationRow[]);
        lastLoadedAt.current = Date.now();
      }
      if (countRes.ok) {
        const countJson = await countRes.json().catch(() => null);
        if (countJson && typeof countJson.unread_count === "number") {
          setUnread(countJson.unread_count);
        } else if (listRes.ok && Array.isArray(list)) {
          setUnread((list as NotificationRow[]).filter((n) => !n.read_at).length);
        }
      } else if (listRes.ok && Array.isArray(list)) {
        setUnread((list as NotificationRow[]).filter((n) => !n.read_at).length);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load({ silent: true });
    }, 45000);
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
    <div
      className="relative"
      ref={panelRef}
      onMouseEnter={() => {
        setOpen(true);
        if (Date.now() - lastLoadedAt.current > 15000) void load();
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && Date.now() - lastLoadedAt.current > 15000) void load();
        }}
        className={
          buttonClassName ??
          "admin-card relative flex h-10 w-10 items-center justify-center rounded-xl text-[#1457D0] transition hover:bg-[var(--admin-soft)]"
        }
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
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white text-[#011B33] shadow-[0_12px_32px_rgba(7,14,34,0.16)] dark:border-white/10 dark:bg-[#10192f] dark:text-[#eef4ff]">
          <div className="flex items-center justify-between border-b border-brand-ink/10 px-4 py-3 dark:border-white/10">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-brand-accent hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#011B33]/55 dark:text-[#eef4ff]/55">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#011B33]/55 dark:text-[#eef4ff]/55">You are all caught up.</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div
                    className={`border-b border-brand-ink/10 px-4 py-3 transition hover:bg-[#f6f8fb] dark:border-white/10 dark:hover:bg-white/5 ${
                      n.read_at ? "opacity-75" : "bg-brand-accent/5"
                    }`}
                  >
                    <p className="text-sm font-bold">{n.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#011B33]/60 dark:text-[#eef4ff]/60">{n.body}</p>
                    <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#011B33]/40 dark:text-[#eef4ff]/40">
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
