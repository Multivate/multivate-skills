"use client";

import { Bell, BookOpen, GraduationCap, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link_href: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function KindIcon({ kind }: { kind: string }) {
  const Icon: ComponentType<{ className?: string; strokeWidth?: number }> =
    kind.includes("enroll") || kind.includes("course")
      ? BookOpen
      : kind.includes("mentor") || kind.includes("signup")
        ? UserRound
        : kind.includes("welcome")
          ? GraduationCap
          : Bell;
  return <Icon className="h-4 w-4" strokeWidth={2} />;
}

export function NotificationBell({ label, buttonClassName }: { label: string; buttonClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLoadedAt = useRef(0);
  useBodyScrollLock(open, scrollRef);

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

  useEffect(() => setMounted(true), []);

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
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
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

  const panel = open ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-[#10244F]/25"
        aria-label="Close"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        className="desk-overlay fixed inset-x-3 top-[4.5rem] z-[80] flex max-h-[min(32rem,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-xl border border-brand-ink/10 bg-white text-[#011B33] shadow-[0_16px_40px_rgba(16,36,79,0.18)] dark:border-white/10 dark:bg-[#0d1528] dark:text-[#eef4ff] sm:inset-x-auto sm:right-3 sm:w-[22.5rem]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3.5">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold tracking-tight">Notifications</p>
            {unread > 0 ? (
              <span className="rounded-full bg-brand-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
            ) : null}
          </div>
          {unread > 0 ? (
            <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-brand-accent">
              Mark all
            </button>
          ) : null}
        </div>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 [-webkit-overflow-scrolling:touch]">
          {loading && items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[#011B33]/45 dark:text-[#eef4ff]/45">Loading</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[#011B33]/45 dark:text-[#eef4ff]/45">No notifications</p>
          ) : (
            <ul className="space-y-1">
              {items.map((n) => {
                const unreadItem = !n.read_at;
                const body = n.body.trim() && n.body.trim() !== n.title.trim() ? n.body.trim() : "";
                const inner = (
                  <div
                    className={`flex gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      unreadItem
                        ? "bg-[#f4f7fd] dark:bg-white/[0.08]"
                        : "hover:bg-[#f6f8fb] dark:hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        unreadItem ? "bg-brand-accent text-white" : "bg-brand-ink/8 text-[#011B33]/55 dark:bg-white/10 dark:text-[#eef4ff]/60"
                      }`}
                    >
                      <KindIcon kind={n.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-sm leading-snug ${unreadItem ? "font-semibold" : "font-medium text-[#011B33]/80 dark:text-[#eef4ff]/80"}`}>
                          {n.title}
                        </span>
                        <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-[#011B33]/40 dark:text-[#eef4ff]/40">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                      {body ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[#011B33]/55 dark:text-[#eef4ff]/50">
                          {body}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
                if (n.link_href) {
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.link_href}
                        className="block"
                        onClick={() => {
                          if (unreadItem) void markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {inner}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => {
                        if (unreadItem) void markRead(n.id);
                      }}
                    >
                      {inner}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="relative" ref={buttonRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
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
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0d1528]" />
        ) : null}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
