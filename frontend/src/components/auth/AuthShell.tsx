import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/layout/LogoMark";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-muted">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-layout items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Multivate home"
          >
            <LogoMark className="max-w-[9rem] sm:max-w-[10rem]" />
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 transition hover:text-brand-primary"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/95 bg-white p-8 shadow-card sm:p-10">
          <h1 className="text-center text-2xl font-extrabold tracking-tight text-brand-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-center text-sm leading-relaxed text-slate-600">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
