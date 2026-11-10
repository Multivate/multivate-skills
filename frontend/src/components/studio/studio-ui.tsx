import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export const studioLabelClass = "block text-sm font-semibold text-[#011B33] dark:text-[#eef4ff]";

export const studioFieldClass =
  "mt-1.5 w-full rounded-[5px] border border-brand-ink/15 bg-white px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-brand-ink/35 outline-none transition focus:border-brand-accent";

export const studioTextareaClass = `${studioFieldClass} min-h-[7rem] resize-y leading-relaxed`;

export const studioSelectClass = studioFieldClass;

export function StudioPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="text-sm text-[#011B33]/50">{eyebrow}</p> : null}
        <h1 className={`text-[1.75rem] font-extrabold tracking-tight sm:text-[2rem] ${eyebrow ? "mt-1" : ""}`}>
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-prose text-sm leading-relaxed text-[#011B33]/60">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function StudioPanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white shadow-[0_8px_24px_rgba(16,36,79,0.04)] ${className}`}>
      {title ? (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-ink/10 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-extrabold text-[#011B33]">{title}</h2>
            {description ? <p className="mt-1 max-w-prose text-sm leading-relaxed text-[#011B33]/55">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

export function StudioQuietLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-brand-accent transition hover:text-brand-accent-dark">
      {children}
    </Link>
  );
}

export function StudioStatusPill({ status }: { status: string }) {
  const label =
    status === "published" ? "Live" : status === "pending_review" ? "In review" : status === "archived" ? "Archived" : "Draft";
  const tone =
    status === "published"
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
      : status === "pending_review"
        ? "bg-amber-50 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
        : "bg-[#eef3fb] text-[#011B33]/70 dark:bg-white/10 dark:text-[#eef4ff]/75";
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>
      {label}
    </span>
  );
}

export function StudioStepNav({
  steps,
  current,
  onChange,
}: {
  steps: string[];
  current: number;
  onChange: (index: number) => void;
}) {
  return (
    <nav aria-label="Studio steps" className="rounded-[5px] border border-brand-ink/10 bg-white p-2">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((label, index) => {
          const active = index === current;
          const done = index < current;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onChange(index)}
                className={`flex w-full items-center gap-3 rounded-[5px] px-3 py-3 text-left transition ${
                  active ? "bg-brand-accent text-white" : "text-brand-ink hover:bg-brand-sky dark:hover:bg-white/10"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    active
                      ? "bg-white text-brand-accent"
                      : done
                        ? "bg-brand-ink text-white dark:bg-[#8ec0ff] dark:text-[#070e22]"
                        : "border border-brand-ink/20 text-brand-ink/50 dark:border-white/20 dark:text-[#eef4ff]/50"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={`text-sm font-semibold ${active ? "text-white" : done ? "text-brand-ink" : "text-brand-ink/55"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
