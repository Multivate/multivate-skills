"use client";

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  applyDocumentTheme,
  readStoredTheme,
  resolveDark,
  writeStoredTheme,
  type ThemeChoice,
} from "@/lib/appearance";

const OPTIONS: { id: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

type AppearanceValue = {
  choice: ThemeChoice;
  dark: boolean;
  choose: (next: ThemeChoice) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setChoice(readStoredTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setSystemDark(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const resolvedChoice = choice ?? "light";
  const dark = choice == null ? false : resolveDark(choice, systemDark);

  useEffect(() => {
    if (choice == null) return;
    applyDocumentTheme(resolveDark(choice, systemDark), pathname);
  }, [choice, systemDark, pathname]);

  const value = useMemo<AppearanceValue>(
    () => ({
      choice: resolvedChoice,
      dark,
      choose: (next) => {
        setChoice(next);
        writeStoredTheme(next);
      },
    }),
    [resolvedChoice, dark],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    return { choice: "light" as ThemeChoice, dark: false, choose: () => undefined };
  }
  return ctx;
}

export function AppearanceMenu({ variant = "desk" }: { variant?: "desk" | "admin" }) {
  const { choice, dark, choose } = useAppearance();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const desk = variant === "desk";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Appearance"
        onClick={() => setOpen((value) => !value)}
        className={
          desk
            ? "relative flex h-10 w-10 items-center justify-center rounded-[5px] text-[#011B33] transition duration-200 hover:bg-white/70 hover:text-brand-accent dark:text-[#eef4ff] dark:hover:bg-white/10"
            : "admin-card inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#1457D0]"
        }
      >
        {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>
      {open ? (
        <div
          className={
            desk
              ? "absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white py-1 shadow-[0_12px_28px_rgba(16,36,79,0.14)] dark:border-white/10 dark:bg-[#10192f]"
              : "admin-card absolute right-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-xl py-1 shadow-[0_12px_32px_rgba(7,14,34,0.16)]"
          }
          role="menu"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = choice === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  choose(option.id);
                  setOpen(false);
                }}
                className={
                  desk
                    ? "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[#011B33] hover:bg-brand-sky hover:text-brand-accent dark:text-[#eef4ff] dark:hover:bg-white/10"
                    : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-[var(--admin-soft)]"
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{option.label}</span>
                {selected ? <Check className="ml-auto h-4 w-4 text-brand-accent" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
