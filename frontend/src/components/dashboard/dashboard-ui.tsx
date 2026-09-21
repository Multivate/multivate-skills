import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export function DashboardPageHeader({
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

export function DashboardMetricStrip({
  items,
}: {
  items: { label: string; value: ReactNode; hint?: ReactNode }[];
}) {
  const gridClass =
    items.length >= 5
      ? "sm:grid-cols-2 xl:grid-cols-5"
      : items.length === 4
        ? "sm:grid-cols-2 xl:grid-cols-4"
        : items.length === 3
          ? "sm:grid-cols-3"
          : "sm:grid-cols-2";

  return (
    <section className="border-y border-brand-ink/10">
      <div className={`grid divide-y divide-brand-ink/10 sm:divide-x sm:divide-y-0 ${gridClass}`}>
        {items.map((item) => (
          <div key={item.label} className="px-0 py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-neutral-500">{item.label}</p>
            <p className="mt-3 font-display text-3xl font-semibold tabular-nums leading-none tracking-tighter text-zinc-900">{item.value}</p>
            {item.hint ? <div className="mt-2 text-sm leading-relaxed text-neutral-500">{item.hint}</div> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardPanel({
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

export function DashboardState({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error" | "success" | "warn";
}) {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-brand-ink/10 bg-brand-surface text-brand-ink/70";
  return (
    <div className={`mx-auto max-w-prose border px-6 py-10 text-left text-sm leading-relaxed ${toneClass}`}>{children}</div>
  );
}

export function DashboardQuietLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-brand-accent transition hover:text-brand-accent-dark">
      {children}
    </Link>
  );
}
