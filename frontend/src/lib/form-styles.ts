/** Shared form field classes — readable in light and dark mode. */
export const formLabelClass =
  "block text-sm font-semibold text-slate-800 dark:text-slate-100";

export const formInputClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-ink placeholder:text-slate-400 transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

export const formInputCompactClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-brand-ink placeholder:text-slate-400 transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

export const formTextareaClass = `${formInputClass} resize-y min-h-[5rem]`;
