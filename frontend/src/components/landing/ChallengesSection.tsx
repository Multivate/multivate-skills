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
    <section id="challenges" className="bg-brand-paper section-y">
      <div className="container-page">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="tag-overline">{t("challengeKicker")}</p>
            <h2 className="heading-section mt-4 text-3xl sm:text-4xl">{t("challengeTitle")}</h2>
            <ul className="mt-10 space-y-8">
              {challenges.map((item) => (
                <li key={item.title}>
                  <h3 className="font-display text-lg font-semibold text-brand-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-brand-ink/65">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="tag-overline">{t("solutionKicker")}</p>
            <h2 className="heading-section mt-4 text-3xl sm:text-4xl">{t("solutionTitle")}</h2>
            <ul className="mt-10 space-y-8">
              {solutions.map((item) => (
                <li key={item.title}>
                  <h3 className="font-display text-lg font-semibold text-brand-ink">{item.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-ink/65">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
