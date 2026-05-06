import { Award, BookMarked, Play, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";

const stepStyles = [
  "bg-violet-50 text-brand-primary ring-violet-100",
  "bg-sky-50 text-sky-600 ring-sky-100",
  "bg-slate-800 text-white ring-slate-700",
  "bg-orange-50 text-orange-600 ring-orange-100",
] as const;

const stepIcons = [UserPlus, BookMarked, Play, Award] as const;

export async function HowItWorksSection() {
  const t = await getTranslations("howItWorks");

  const steps = [
    { title: t("step1Title"), body: t("step1Body"), icon: stepIcons[0], wrap: stepStyles[0] },
    { title: t("step2Title"), body: t("step2Body"), icon: stepIcons[1], wrap: stepStyles[1] },
    { title: t("step3Title"), body: t("step3Body"), icon: stepIcons[2], wrap: stepStyles[2] },
    { title: t("step4Title"), body: t("step4Body"), icon: stepIcons[3], wrap: stepStyles[3] },
  ];

  return (
    <section className="section-y bg-white">
      <div className="container-page">
        <h2 className="heading-section text-center text-2xl sm:text-3xl lg:text-[2rem]">{t("heading")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600">{t("sub")}</p>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-10 hidden border-t-2 border-dotted border-slate-200 lg:block" />

          <div className="hidden gap-4 lg:grid lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="relative flex flex-col items-center px-1 text-center">
                <div
                  className={`relative z-10 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl shadow-sm ring-1 ${s.wrap}`}
                >
                  <s.icon className="h-8 w-8" strokeWidth={1.65} />
                </div>
                <span className="mt-3 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 shadow-sm">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 max-w-[13.5rem] text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 space-y-0 lg:hidden">
            {steps.map((s, i) => (
              <div key={s.title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ${s.wrap}`}
                  >
                    <s.icon className="h-6 w-6" strokeWidth={1.65} />
                  </div>
                  {i < steps.length - 1 ? (
                    <div
                      className="my-1 w-0 border-l-2 border-dotted border-slate-200"
                      style={{ minHeight: "2.5rem" }}
                    />
                  ) : null}
                </div>
                <div className="pb-10 pt-1">
                  <span className="text-xs font-bold text-slate-400">
                    {t("stepLabel", { n: i + 1 })}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
