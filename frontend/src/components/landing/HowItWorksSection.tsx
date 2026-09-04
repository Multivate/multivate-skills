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
    <section className="section-y bg-brand-ink text-white">
      <div className="container-page">
        <div className="max-w-2xl">
          <div className="marketing-rule" aria-hidden />
          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("heading")}</h2>
          <p className="mt-4 text-base leading-relaxed text-white/65">{t("sub")}</p>
        </div>

        <ol className="mt-14 grid gap-0 border-t border-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="border-b border-white/15 px-0 py-8 sm:border-b-0 sm:px-6 sm:py-10 sm:first:pl-0 lg:border-r lg:border-white/15 lg:last:border-r-0"
            >
              <span className="font-display text-4xl font-bold tabular-nums text-brand-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
