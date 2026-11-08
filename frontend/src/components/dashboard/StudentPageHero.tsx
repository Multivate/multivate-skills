import type { ReactNode } from "react";

export function StudentPageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b-4 border-brand-accent bg-[#10244F] text-white">
      <div className="mx-auto max-w-[84rem] px-4 py-10 sm:px-6">
        <h1 className="text-[2rem] font-extrabold tracking-tight sm:text-[2.5rem]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-white/75">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function StudentSurface({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[84rem] px-4 py-8 sm:px-6">{children}</div>;
}

export function StudentPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded border border-[#d1d7dc] bg-white p-5 sm:p-6 dark:border-white/10 dark:bg-[#10192f] dark:text-[#eef4ff] ${className}`}>
      {children}
    </section>
  );
}
