import type { ReactNode } from "react";

export function NotConfiguredNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-8 shadow-sm sm:p-10">
      <h1 className="text-xl font-extrabold tracking-tight text-brand-ink">{title}</h1>
      <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}
