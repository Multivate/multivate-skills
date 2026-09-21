import type { ReactNode } from "react";

export function NotConfiguredNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl rounded-md border border-neutral-200/90 bg-brand-surface dark:border-zinc-800/90 dark:bg-zinc-900 p-8 shadow-sm sm:p-10">
      <h1 className="text-xl font-semibold tracking-tighter text-brand-ink">{title}</h1>
      <div className="mt-3 text-sm leading-relaxed text-neutral-500">{children}</div>
    </div>
  );
}
