import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export const studioLabelClass =
  "block font-mono text-xs font-semibold uppercase tracking-widest text-neutral-500";

export const studioFieldClass =
  "mt-2 w-full border border-brand-ink/15 bg-brand-surface px-3.5 py-2.5 text-sm text-brand-ink placeholder:text-brand-ink/35 transition focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent/30";

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
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-ink/10 pb-8">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="tag-overline">{eyebrow}</p> : null}
        <h1 className={`heading-display text-3xl sm:text-4xl ${eyebrow ? "mt-3" : ""}`}>
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-prose text-sm leading-relaxed text-neutral-500 sm:text-base">{description}</p> : null}
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
    <section className={`border border-brand-ink/10 bg-brand-surface ${className}`}>
      {title ? (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-ink/10 px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-semibold leading-[1.1] tracking-tighter text-zinc-900 sm:text-xl">{title}</h2>
            {description ? <p className="mt-1 max-w-prose text-sm leading-relaxed text-neutral-500">{description}</p> : null}
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
      ? "bg-emerald-50 text-emerald-900"
      : status === "pending_review"
        ? "bg-amber-50 text-amber-950"
        : "bg-brand-muted text-brand-ink/70";
  return (
    <span className={`inline-flex rounded-sm px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-widest ${tone}`}>
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
    <nav aria-label="Studio steps" className="border-y border-brand-ink/10">
      <ol className="grid grid-cols-2 sm:grid-cols-4">
        {steps.map((label, index) => {
          const active = index === current;
          const done = index < current;
          return (
            <li key={label} className="border-brand-ink/10 sm:border-r sm:last:border-r-0 [&:nth-child(odd)]:border-r max-sm:border-b max-sm:[&:nth-child(n+3)]:border-b-0">
              <button
                type="button"
                onClick={() => onChange(index)}
                className={`flex w-full items-center gap-3 px-4 py-4 text-left transition sm:px-5 ${
                  active ? "bg-brand-ink text-white" : "bg-transparent text-brand-ink hover:bg-brand-muted/70"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center font-display text-sm font-bold tabular-nums ${
                    active ? "bg-brand-accent text-white" : done ? "bg-brand-ink text-white" : "border border-brand-ink/20 text-brand-ink/50"
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
