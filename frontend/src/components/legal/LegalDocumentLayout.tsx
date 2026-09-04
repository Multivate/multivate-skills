import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export function LegalDocumentLayout({
  title,
  updated,
  intro,
  sections,
  contactEmail = "info@multivate.com.ng",
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  contactEmail?: string;
}) {
  return (
    <div className="min-h-screen bg-brand-paper text-brand-ink">
      <header className="border-b border-brand-ink/10 bg-brand-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="font-display text-lg font-bold tracking-tight text-white">
            Multivate
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:text-white"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="tag-overline">Legal</p>
          <div className="marketing-rule mt-4" aria-hidden />
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-brand-ink/50">Last updated: {updated}</p>
          <p className="mt-6 text-base leading-relaxed text-brand-ink/70">{intro}</p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
          <nav className="lg:sticky lg:top-8 lg:self-start" aria-label="On this page">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand-ink/45">Contents</p>
            <ol className="mt-4 space-y-2 border-l border-brand-ink/10">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block border-l-2 border-transparent py-1 pl-4 text-sm text-brand-ink/60 transition hover:border-brand-accent hover:text-brand-ink"
                  >
                    <span className="mr-2 tabular-nums text-brand-ink/35">{String(i + 1).padStart(2, "0")}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-10 border-t border-brand-ink/10 pt-8 lg:border-t-0 lg:pt-0">
            {sections.map((section, i) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-brand-ink">
                  <span className="mr-3 text-brand-accent/80">{String(i + 1).padStart(2, "0")}</span>
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-brand-ink/70 sm:text-[0.9375rem]">
                  {section.body}
                </div>
              </section>
            ))}

            <footer className="border-t border-brand-ink/10 pt-8">
              <p className="text-sm text-brand-ink/65">
                Questions about this document? Email{" "}
                <a href={`mailto:${contactEmail}`} className="font-semibold text-brand-accent hover:text-brand-accent-dark">
                  {contactEmail}
                </a>
                .
              </p>
              <p className="mt-6 text-xs text-brand-ink/45">
                You can close this tab and return to registration. Your form entries on the other tab stay as you left them.
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-brand-accent">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
