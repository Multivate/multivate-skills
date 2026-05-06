import type { LucideIcon } from "lucide-react";
import {
  Clock,
  GraduationCap,
  Lightbulb,
  Lock,
  Target,
  Wrench,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Brand accents — flat fills only (no gradients). */
const accent = {
  challenge: {
    label: "text-[#E85D4A]",
    rule: "bg-[#E85D4A]",
    cardBg: "bg-[#FDF5F4]",
    cardBorder: "border-rose-200/55",
    iconRing: "border-[#E85D4A] text-[#E85D4A]",
  },
  solution: {
    label: "text-[#4F46E5]",
    rule: "bg-[#4F46E5]",
    cardBg: "bg-[#F3FBF6]",
    cardBorder: "border-emerald-200/55",
    iconRing: "border-[#16A34A] text-[#16A34A]",
  },
} as const;

const challengeIcons = [Clock, GraduationCap, Lock] as const;
const solutionIcons = [Target, Wrench, Lightbulb] as const;

function SplitCard({
  title,
  body,
  icon: Icon,
  tone,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
  tone: (typeof accent)["challenge"] | (typeof accent)["solution"];
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-7 ${tone.cardBg} ${tone.cardBorder}`}
    >
      <div
        className={`mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 bg-white ${tone.iconRing}`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.65} aria-hidden />
      </div>
      <h3 className="mt-5 text-center text-sm font-semibold leading-snug tracking-tight text-brand-ink">{title}</h3>
      <p className="mt-2.5 flex-1 text-center text-[0.8125rem] leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function ColumnHeader({
  kicker,
  title,
  tone,
}: {
  kicker: string;
  title: string;
  tone: (typeof accent)["challenge"] | (typeof accent)["solution"];
}) {
  return (
    <header className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
      <p
        className={`text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.18em] text-balance sm:text-[11px] ${tone.label}`}
      >
        {kicker}
      </p>
      <h2 className="mt-3.5 font-sans text-2xl font-extrabold leading-[1.15] tracking-tight text-brand-ink sm:text-[1.65rem] lg:text-[1.75rem] xl:text-[1.875rem]">
        {title}
      </h2>
      <div className={`mx-auto mt-5 h-1.5 w-12 rounded-sm lg:mx-0 ${tone.rule}`} aria-hidden />
    </header>
  );
}

export async function ChallengesSection() {
  const t = await getTranslations("challenges");

  const challenges = [
    { title: t("c1Title"), body: t("c1Body"), icon: challengeIcons[0] },
    { title: t("c2Title"), body: t("c2Body"), icon: challengeIcons[1] },
    { title: t("c3Title"), body: t("c3Body"), icon: challengeIcons[2] },
  ];

  const solutions = [
    { title: t("s1Title"), body: t("s1Body"), icon: solutionIcons[0] },
    { title: t("s2Title"), body: t("s2Body"), icon: solutionIcons[1] },
    { title: t("s3Title"), body: t("s3Body"), icon: solutionIcons[2] },
  ];

  return (
    <section
      id="challenges"
      className="border-y border-slate-200/80 bg-white py-16 sm:py-20 lg:py-24"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-stretch lg:gap-0">
          <div className="lg:border-r lg:border-slate-200 lg:pr-10 xl:pr-16">
            <ColumnHeader
              kicker={t("challengeKicker")}
              title={t("challengeTitle")}
              tone={accent.challenge}
            />
            <div className="mt-10 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-5">
              {challenges.map((c) => (
                <SplitCard key={c.title} {...c} tone={accent.challenge} />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-14 lg:border-t-0 lg:pt-0 lg:pl-10 xl:pl-16">
            <ColumnHeader kicker={t("solutionKicker")} title={t("solutionTitle")} tone={accent.solution} />
            <div className="mt-10 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-5">
              {solutions.map((s) => (
                <SplitCard key={s.title} {...s} tone={accent.solution} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
