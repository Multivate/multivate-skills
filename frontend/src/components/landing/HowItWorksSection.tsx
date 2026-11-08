import { getTranslations } from "next-intl/server";

export async function HowItWorksSection() {
  const t = await getTranslations("howItWorks");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  return (
    <section className="bg-brand-muted py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">{t("heading")}</h2>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-brand-ink/70">{t("sub")}</p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              {index < steps.length - 1 ? (
                <span
                  className="absolute left-5 top-5 hidden h-px w-[calc(100%-1.25rem)] bg-brand-accent/25 lg:block"
                  aria-hidden
                />
              ) : null}
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-brand-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-ink/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
