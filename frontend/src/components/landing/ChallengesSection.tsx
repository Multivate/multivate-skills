import { getTranslations } from "next-intl/server";

export async function ChallengesSection() {
  const t = await getTranslations("challenges");

  const challenges = [
    { title: t("c1Title"), body: t("c1Body") },
    { title: t("c2Title"), body: t("c2Body") },
    { title: t("c3Title"), body: t("c3Body") },
  ];

  const solutions = [
    { title: t("s1Title"), body: t("s1Body") },
    { title: t("s2Title"), body: t("s2Body") },
    { title: t("s3Title"), body: t("s3Body") },
  ];

  return (
    <section id="challenges" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="container-page grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="rounded-2xl border border-brand-ink/10 bg-white p-7 sm:p-10">
          <p className="text-sm font-semibold text-brand-accent">{t("challengeKicker")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">
            {t("challengeTitle")}
          </h2>
          <ul className="mt-8 divide-y divide-brand-ink/10">
            {challenges.map((item, index) => (
              <li key={item.title} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                <span className="mt-0.5 text-sm font-semibold tabular-nums text-brand-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-brand-ink">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-ink/70">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-brand-navy p-7 text-white sm:p-10">
          <p className="text-sm font-semibold text-[#b7dcff]">{t("solutionKicker")}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">{t("solutionTitle")}</h2>
          <ul className="mt-8 space-y-6">
            {solutions.map((item) => (
              <li key={item.title} className="border-l-2 border-[#2B8AE0] pl-4">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
