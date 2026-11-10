"use client";

import { X } from "lucide-react";
import { useLocale } from "next-intl";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { persistPreferredLocale } from "@/lib/preferred-locale";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

export const deskFlyoutLink =
  "block px-4 py-2 text-sm font-medium text-[#011B33] transition duration-200 hover:bg-brand-sky hover:text-brand-accent dark:text-[#eef4ff] dark:hover:bg-white/10";

export function DeskProfileMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open, scrollRef);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent | globalThis.MouseEvent) {
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

  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>, {
        onClick: (event: MouseEvent<HTMLElement>) => {
          (trigger as ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>).props.onClick?.(event);
          setOpen((value) => !value);
        },
      })
    : trigger;

  const panel = open ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-[#011B33]/30"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="menu"
        className="desk-overlay fixed inset-x-3 top-[4.5rem] z-[80] flex max-h-[calc(100dvh-5.25rem)] flex-col overflow-hidden rounded-xl border border-brand-ink/10 bg-white text-[#011B33] shadow-[0_16px_40px_rgba(16,36,79,0.18)] dark:border-white/10 dark:bg-[#10192f] dark:text-[#eef4ff] sm:inset-x-auto sm:right-3 sm:max-h-[min(36rem,calc(100dvh-5.5rem))] sm:w-[20rem]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-ink/10 px-4 py-3 dark:border-white/10">
          <p className="text-sm font-semibold">Account</p>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[5px] text-[#011B33] hover:bg-brand-sky dark:text-[#eef4ff] dark:hover:bg-white/10"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="relative" ref={buttonRef}>
      {triggerNode}
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export function DeskProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-brand-ink/10 dark:border-white/10">
      <p className="px-4 pb-0.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#011B33]/40 dark:text-[#eef4ff]/40">
        {title}
      </p>
      {children}
    </div>
  );
}

export function DeskMobileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-brand-ink/10 py-1 first:border-t-0 dark:border-white/10">
      <p className="px-0 pb-0.5 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#011B33]/40 dark:text-[#eef4ff]/40">
        {title}
      </p>
      {children}
    </div>
  );
}

export function DeskLocaleChips() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="px-4 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#011B33]/40 dark:text-[#eef4ff]/40">Language</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {routing.locales.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              className={`rounded-[5px] px-2 py-1 text-xs font-semibold uppercase ${
                active
                  ? "bg-brand-accent text-white"
                  : "bg-brand-sky text-[#011B33] hover:bg-brand-sky/80 dark:bg-white/10 dark:text-[#eef4ff] dark:hover:bg-white/15"
              }`}
              onClick={() => {
                const next = code as AppLocale;
                void persistPreferredLocale(next);
                if (next !== locale) {
                  router.replace(pathname, { locale: next });
                  router.refresh();
                }
              }}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
