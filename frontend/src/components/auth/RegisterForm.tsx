"use client";

import { Mail, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import {
  isLearnTarget,
  readAuthEmail,
  readRememberedTarget,
  rememberAuthEmail,
  rememberLearning,
  storedLearnTarget,
  type LearnTarget,
} from "@/components/auth/LearningFields";
import { PasswordField } from "@/components/auth/PasswordField";
import { LogoMark } from "@/components/layout/LogoMark";
import { useAuth } from "@/contexts/auth-context";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { hardNavigate, homeForRole } from "@/lib/auth-navigation";
import type { UserRole } from "@/types/user";

type Step =
  | "welcome"
  | "role"
  | "speak"
  | "learn"
  | "why"
  | "level"
  | "time"
  | "mode"
  | "campus"
  | "plan"
  | "teach"
  | "years"
  | "account"
  | "otp";

type Role = "" | "student" | "instructor" | "mentor";

const WHY_LABEL: Record<string, string> = {
  work: "skilled work in Germany",
  study: "university study in Germany",
  train: "Ausbildung in Germany",
  live: "living everyday life in Germany",
  explore: "exploring a path to Germany",
};

function stepsFor(role: Role, learn: string, studyMode: "online" | "hybrid" | "physical" = "online"): Step[] {
  if (role === "instructor") return ["welcome", "role", "teach", "speak", "years", "account", "otp"];
  if (role === "mentor") return ["welcome", "role", "account", "otp"];
  const student: Step[] = ["welcome", "role", "speak", "learn", "why"];
  if (learn !== "technology") student.push("level");
  student.push("time", "mode");
  if (studyMode !== "online") student.push("campus");
  student.push("plan", "account", "otp");
  return student;
}

function ChoiceCard({
  image,
  title,
  hint,
  selected,
  onClick,
}: {
  image?: string;
  title: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 overflow-hidden rounded-[14px] border bg-white p-2.5 text-left transition duration-200 ${
        selected
          ? "border-brand-accent ring-2 ring-brand-accent/20"
          : "border-brand-ink/10 active:border-brand-accent/40"
      }`}
    >
      {image ? (
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] sm:h-16 sm:w-16">
          <img src={image} alt="" className="h-full w-full object-cover" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-[15px] font-bold leading-snug text-[#10244F]">{title}</span>
        {hint ? <span className="mt-0.5 block text-[12px] leading-snug text-[#10244F]/60">{hint}</span> : null}
      </span>
    </button>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tLogin = useTranslations("auth.login");
  const tLearn = useTranslations("auth.learning");
  const tTeach = useTranslations("dashboard.teachingProfile");
  const tNames = useTranslations("localeNames");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const { registerStart, registerVerify, user, loading } = useAuth();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("welcome");
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [learn, setLearn] = useState("");
  const [learnWith, setLearnWith] = useState<AppLocale>(locale);
  const [why, setWhy] = useState("");
  const [level, setLevel] = useState("");
  const [hours, setHours] = useState("5to10");
  const [studyMode, setStudyMode] = useState<"online" | "hybrid" | "physical">("online");
  const [campusLocation, setCampusLocation] = useState("Ibadan, Oyo state");
  const [cohortName, setCohortName] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signupSession, setSignupSession] = useState<{ token: string; masked: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const advanceTimer = useRef<number | null>(null);

  const steps = useMemo(() => stepsFor(role, learn, studyMode), [role, learn, studyMode]);
  const index = Math.max(0, steps.indexOf(step));
  const progress = Math.round(((index + 1) / steps.length) * 100);

  useEffect(() => {
    setLearn(readRememberedTarget());
    const savedEmail = readAuthEmail();
    if (savedEmail) setEmail(savedEmail);
  }, []);

  useEffect(() => {
    if (loading || !user || !pathname.includes("/register")) return;
    hardNavigate(homeForRole(user.role), learnWith);
  }, [loading, user, learnWith, pathname]);

  useEffect(() => {
    const intent = searchParams.get("intent");
    if (intent === "instructor" || intent === "teach") setRole("instructor");
  }, [searchParams]);

  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (!oauthError) return;
    if (oauthError === "cancelled") setError(tLogin("oauthCancelled"));
    else if (oauthError === "unavailable") setError(t("oauthUnavailable"));
    else setError(tLogin("oauthError"));
  }, [searchParams, t, tLogin]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  function goTo(next: Step, direction: "fwd" | "back" = "fwd") {
    setError(null);
    setDir(direction);
    setStep(next);
  }

  function go(delta: number) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    goTo(steps[nextIndex], delta < 0 ? "back" : "fwd");
  }

  function pickThenNext(
    apply: () => void,
    nextRole = role,
    nextLearn = learn,
    nextMode: "online" | "hybrid" | "physical" = studyMode,
  ) {
    apply();
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      const list = stepsFor(nextRole, nextLearn, nextMode);
      const here = list.indexOf(step);
      const following = list[here + 1];
      if (following) goTo(following, "fwd");
    }, 240);
  }

  function chooseLearnWith(next: AppLocale) {
    setLearnWith(next);
    rememberLearning(learn, next);
    rememberAuthEmail(email);
  }

  async function startAccount() {
    setError(null);
    if (!role) {
      setError(t("errRole"));
      return;
    }
    if (role !== "mentor" && !isLearnTarget(learn)) {
      setError(role === "instructor" ? tLearn("errTeach") : tLearn("errLearn"));
      return;
    }
    if (role === "instructor" && !yearsExperience.trim()) {
      setError(tTeach("requiredYears"));
      return;
    }
    if (!agreed) {
      setError(t("errTerms"));
      return;
    }
    if (password.length < 8) {
      setError(t("errPasswordLen"));
      return;
    }
    if (password !== confirm) {
      setError(t("errPasswordMatch"));
      return;
    }

    setPending(true);
    try {
      const topic = isLearnTarget(learn) ? storedLearnTarget(learn as LearnTarget) : "";
      rememberLearning(learn, learnWith);
      const goalCode = why || "explore";
      const germanLevel = learn === "technology" ? "none" : level || "none";
      const goal = WHY_LABEL[goalCode] || `Learn with ${learnWith}`;
      const startPayload: import("@/services/auth").RegisterPayload =
        role === "student"
          ? {
              role: "student",
              name: name.trim(),
              email: email.trim(),
              password,
              learning_profile: {
                education_level: "other",
                current_skills: germanLevel,
                skills_to_learn: topic,
                learning_goals: goal,
                preferred_formats:
                  studyMode === "physical"
                    ? "Physical (on campus)"
                    : studyMode === "hybrid"
                      ? "Hybrid (campus + online)"
                      : "Online (self-paced)",
                weekly_hours: hours,
                career_direction: goalCode,
                extra_notes: `learn_with:${learnWith};level:${germanLevel};goal:${goalCode}`,
                goal_code: goalCode,
                german_level: germanLevel,
                instruction_locale: learnWith,
                study_mode: studyMode,
                campus_location: studyMode === "online" ? null : campusLocation.trim() || "Ibadan, Oyo state",
                cohort_name: studyMode === "online" ? null : cohortName.trim() || null,
              },
            }
          : role === "instructor"
            ? {
                role: "instructor",
                name: name.trim(),
                email: email.trim(),
                password,
                teaching_profile: {
                  expertise_areas: topic,
                  teaching_bio: null,
                  subjects_taught: `Teach with ${learnWith}`,
                  years_experience: yearsExperience.trim(),
                  teaching_formats: "Live online",
                  credentials_notes: `teach_with:${learnWith}`,
                  professional_links: null,
                },
              }
            : {
                role: "mentor",
                name: name.trim(),
                email: email.trim(),
                password,
              };
      const started = await registerStart(startPayload);
      const masked = started.email_masked?.trim() ? started.email_masked : email.trim();
      setSignupSession({ token: started.signup_token, masked });
      setOtpCode(started.dev_otp ?? "");
      setError(null);
      goTo("otp", "fwd");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGeneric"));
    } finally {
      setPending(false);
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signupSession || !role) return;
    setError(null);
    setPending(true);
    try {
      await registerVerify(role, signupSession.token, otpCode.trim());
      hardNavigate(homeForRole(role as UserRole), learnWith);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGeneric"));
    } finally {
      setPending(false);
    }
  }

  const anim = dir === "back" ? "sm:animate-onboard-back animate-fade-in" : "sm:animate-onboard-in animate-fade-in";

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#F3F6FA]">
      <header className="shrink-0 border-b border-brand-ink/8 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Multivate home" className="min-w-0">
            <LogoMark className="max-w-[7.5rem]" />
          </Link>
          <Link href="/login" className="shrink-0 text-sm font-semibold text-brand-accent">
            {t("signIn")}
          </Link>
        </div>
        <div className="h-1 bg-brand-ink/10">
          <div className="h-full bg-brand-accent transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:pt-8">
        <div className="mb-3 flex min-h-8 items-center">
          {index > 0 && step !== "otp" ? (
            <button type="button" onClick={() => go(-1)} className="text-sm font-semibold text-[#10244F]/60 hover:text-brand-accent">
              {t("back")}
            </button>
          ) : (
            <span />
          )}
        </div>

        {error ? (
          <p className="mb-3 rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <div key={step} className={`${anim} min-h-0`}>
          {step === "welcome" ? (
            <section>
              <div className="overflow-hidden rounded-[16px]">
                <img src="/marketing/class.jpg" alt="" className="h-36 w-full object-cover sm:h-56" />
              </div>
              <h1 className="mt-4 text-[1.5rem] font-extrabold leading-tight text-[#10244F] sm:mt-6 sm:text-[2.15rem]">
                {t("onboard.welcomeTitle")}
              </h1>
              <p className="mt-2 max-w-lg text-[15px] leading-6 text-[#10244F]/70 sm:mt-3 sm:text-[16px] sm:leading-7">{t("onboard.welcomeBody")}</p>
              <button type="button" onClick={() => go(1)} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-accent text-[16px] font-semibold text-white sm:mt-8 sm:w-auto sm:px-10">
                {t("onboard.start")}
              </button>
            </section>
          ) : null}

          {step === "role" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.roleTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.roleBody")}</p>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
                <ChoiceCard
                  image="/marketing/class.jpg"
                  title={t("roleStudent")}
                  hint={t("onboard.roleStudentHint")}
                  selected={role === "student"}
                  onClick={() => pickThenNext(() => setRole("student"), "student", learn)}
                />
                <ChoiceCard
                  image="/marketing/ask-lena.jpg"
                  title={t("roleInstructor")}
                  hint={t("onboard.roleInstructorHint")}
                  selected={role === "instructor"}
                  onClick={() => pickThenNext(() => setRole("instructor"), "instructor", learn)}
                />
                <ChoiceCard
                  image="/marketing/learners.jpg"
                  title={t("roleMentor")}
                  hint={t("onboard.roleMentorHint")}
                  selected={role === "mentor"}
                  onClick={() => pickThenNext(() => setRole("mentor"), "mentor", learn)}
                />
              </div>
            </section>
          ) : null}

          {step === "speak" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.speakTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.speakBody")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
                {(["en", "fr", "de", "es"] as AppLocale[]).map((code) => (
                  <ChoiceCard
                    key={code}
                    title={tNames(code)}
                    selected={learnWith === code}
                    onClick={() =>
                      pickThenNext(() => {
                        chooseLearnWith(code);
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {step === "learn" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.learnTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.learnBody")}</p>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
                <ChoiceCard
                  image="/marketing/germany.jpg"
                  title={tLearn("learnGerman")}
                  hint={t("onboard.learnGermanHint")}
                  selected={learn === "german"}
                  onClick={() => pickThenNext(() => setLearn("german"), role, "german")}
                />
                <ChoiceCard
                  image="/marketing/study.jpg"
                  title={tLearn("learnTechnology")}
                  hint={t("onboard.learnTechHint")}
                  selected={learn === "technology"}
                  onClick={() => pickThenNext(() => setLearn("technology"), role, "technology")}
                />
                <ChoiceCard
                  image="/marketing/class.jpg"
                  title={tLearn("learnBoth")}
                  hint={t("onboard.learnBothHint")}
                  selected={learn === "both"}
                  onClick={() => pickThenNext(() => setLearn("both"), role, "both")}
                />
              </div>
            </section>
          ) : null}

          {step === "why" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.whyTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.whyBody")}</p>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-2 sm:gap-3">
                {(
                  [
                    ["work", "/marketing/ask-lena.jpg", t("onboard.whyWork")],
                    ["study", "/marketing/class.jpg", t("onboard.whyStudy")],
                    ["train", "/marketing/learners.jpg", t("onboard.whyTrain")],
                    ["live", "/marketing/germany.jpg", t("onboard.whyLive")],
                    ["explore", "/marketing/study.jpg", t("onboard.whyExplore")],
                  ] as const
                ).map(([id, image, title]) => (
                  <ChoiceCard
                    key={id}
                    image={image}
                    title={title}
                    selected={why === id}
                    onClick={() => pickThenNext(() => setWhy(id))}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {step === "level" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.levelTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.levelBody")}</p>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3">
                {(
                  [
                    ["none", t("onboard.levelNone")],
                    ["a1", t("onboard.levelA1")],
                    ["a2", t("onboard.levelA2")],
                    ["b1", t("onboard.levelB1")],
                    ["b2", t("onboard.levelB2")],
                  ] as const
                ).map(([id, title]) => (
                  <ChoiceCard key={id} title={title} selected={level === id} onClick={() => pickThenNext(() => setLevel(id))} />
                ))}
              </div>
            </section>
          ) : null}

          {step === "time" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.timeTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.timeBody")}</p>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3">
                <ChoiceCard title={t("onboard.timeLight")} hint="About 15 minutes a day" selected={hours === "under5"} onClick={() => pickThenNext(() => setHours("under5"))} />
                <ChoiceCard title={t("onboard.timeSteady")} hint="About 30 minutes a day" selected={hours === "5to10"} onClick={() => pickThenNext(() => setHours("5to10"))} />
                <ChoiceCard title={t("onboard.timeSerious")} hint="An hour or more most days" selected={hours === "10to15"} onClick={() => pickThenNext(() => setHours("10to15"))} />
              </div>
            </section>
          ) : null}

          {step === "mode" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.modeTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.modeBody")}</p>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3">
                <ChoiceCard
                  title={t("onboard.modeOnline")}
                  hint={t("onboard.modeOnlineHint")}
                  selected={studyMode === "online"}
                  onClick={() => pickThenNext(() => setStudyMode("online"), role, learn, "online")}
                />
                <ChoiceCard
                  title={t("onboard.modeHybrid")}
                  hint={t("onboard.modeHybridHint")}
                  selected={studyMode === "hybrid"}
                  onClick={() => pickThenNext(() => setStudyMode("hybrid"), role, learn, "hybrid")}
                />
                <ChoiceCard
                  title={t("onboard.modePhysical")}
                  hint={t("onboard.modePhysicalHint")}
                  selected={studyMode === "physical"}
                  onClick={() => pickThenNext(() => setStudyMode("physical"), role, learn, "physical")}
                />
              </div>
            </section>
          ) : null}

          {step === "campus" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.campusTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.campusBody")}</p>
              <p className="mt-5 rounded-[14px] bg-white px-4 py-3 text-[15px] font-semibold text-[#10244F]">{t("onboard.campusPlace")}</p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setCampusLocation("Ibadan, Oyo state");
                  go(1);
                }}
              >
                <label className="block">
                  <span className="text-sm font-semibold text-[#10244F]">{t("onboard.cohortLabel")}</span>
                  <input
                    value={cohortName}
                    onChange={(event) => setCohortName(event.target.value)}
                    className="mt-1.5 w-full rounded-[14px] border border-brand-ink/10 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand-accent"
                    placeholder={t("onboard.cohortPh")}
                  />
                </label>
                <button type="submit" className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-accent text-[16px] font-semibold text-white">
                  {t("onboard.campusContinue")}
                </button>
                <button
                  type="button"
                  className="w-full text-sm font-medium text-[#011B33]"
                  onClick={() => {
                    setCampusLocation("Ibadan, Oyo state");
                    setCohortName("");
                    go(1);
                  }}
                >
                  {t("onboard.campusSkip")}
                </button>
              </form>
            </section>
          ) : null}

          {step === "plan" ? (
            <section>
              <div className="overflow-hidden rounded-[20px]">
                <img src="/marketing/germany.jpg" alt="" className="h-36 w-full object-cover sm:h-56" />
              </div>
              <h1 className="mt-6 text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.planTitle")}</h1>
              <p className="mt-2 text-[15px] leading-7 text-[#10244F]/70">{t("onboard.planBody")}</p>
              <ul className="mt-5 space-y-3">
                {[t("onboard.plan1"), t("onboard.plan2"), t("onboard.plan3")].map((item, i) => (
                  <li key={item} className="flex gap-3 rounded-[14px] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(16,36,79,0.05)]" style={{ animationDelay: `${i * 90}ms` }}>
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent text-[12px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-[15px] text-[#10244F]">{item}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => go(1)} className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-accent text-[16px] font-semibold text-white">
                {t("onboard.create")}
              </button>
            </section>
          ) : null}

          {step === "teach" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.teachTitle")}</h1>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
                <ChoiceCard image="/marketing/germany.jpg" title={tLearn("learnGerman")} selected={learn === "german"} onClick={() => pickThenNext(() => setLearn("german"))} />
                <ChoiceCard image="/marketing/study.jpg" title={tLearn("learnTechnology")} selected={learn === "technology"} onClick={() => pickThenNext(() => setLearn("technology"))} />
                <ChoiceCard image="/marketing/class.jpg" title={tLearn("learnBoth")} selected={learn === "both"} onClick={() => pickThenNext(() => setLearn("both"))} />
              </div>
            </section>
          ) : null}

          {step === "years" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{tTeach("yearsLabel")}</h1>
              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3">
                {(
                  [
                    ["under3", tTeach("yearsOptUnder3")],
                    ["3to5", tTeach("yearsOpt3to5")],
                    ["5to10", tTeach("yearsOpt5to10")],
                    ["10plus", tTeach("yearsOpt10plus")],
                  ] as const
                ).map(([id, title]) => (
                  <ChoiceCard key={id} title={title} selected={yearsExperience === id} onClick={() => pickThenNext(() => setYearsExperience(id))} />
                ))}
              </div>
            </section>
          ) : null}

          {step === "account" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("onboard.accountTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("onboard.accountBody")}</p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void startAccount();
                }}
              >
                <AuthInput id="name" label={t("name")} icon={User} autoComplete="name" required value={name} onChange={setName} placeholder={t("namePh")} />
                <AuthInput id="email" label={t("email")} icon={Mail} type="email" autoComplete="email" required value={email} onChange={setEmail} placeholder={t("emailPh")} />
                <PasswordField label={t("password")} autoComplete="new-password" required value={password} onChange={setPassword} placeholder={t("passwordPh")} />
                <PasswordField label={t("confirm")} autoComplete="new-password" required value={confirm} onChange={setConfirm} placeholder={t("confirmPh")} />
                <div className="flex items-start gap-3">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-ink/25 text-brand-accent"
                  />
                  <p className="text-sm leading-snug text-[#011B33]/75">
                    <label htmlFor="agree-terms" className="cursor-pointer">
                      {t("termsLead")}
                    </label>{" "}
                    <Link href="/terms" className="font-medium text-brand-accent">
                      {t("terms")}
                    </Link>{" "}
                    {t("and")}{" "}
                    <Link href="/privacy" className="font-medium text-brand-accent">
                      {t("privacy")}
                    </Link>
                    .
                  </p>
                </div>
                <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-accent text-[16px] font-semibold text-white disabled:opacity-60">
                  {pending ? t("submittingStart") : t("submit")}
                </button>
              </form>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-brand-ink/10" />
                </div>
                <div className="relative flex justify-center text-xs font-medium text-[#011B33]/45">
                  <span className="bg-[#F3F6FA] px-3">{tLogin("divider")}</span>
                </div>
              </div>
              <AuthSocialButtons
                returnTo={role === "instructor" ? "/instructor" : "/dashboard"}
                locale={learnWith}
                disabled={pending}
                role={role}
                requireRole
                errorTo="/register"
                onNeedRole={() => setError(t("oauthPickRole"))}
              />
            </section>
          ) : null}

          {step === "otp" ? (
            <section>
              <h1 className="text-[1.45rem] font-extrabold leading-tight text-[#10244F] sm:text-[1.7rem]">{t("otpTitle")}</h1>
              <p className="mt-2 text-[15px] text-[#10244F]/65">{t("otpSubtitle", { email: signupSession?.masked ?? email })}</p>
              <form onSubmit={onOtpSubmit} className="mt-6 space-y-4">
                <AuthInput
                  id="reg_otp"
                  label={t("otpCodeLabel")}
                  icon={Mail}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={otpCode}
                  onChange={setOtpCode}
                  placeholder={t("otpCodePh")}
                />
                <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-accent text-[16px] font-semibold text-white disabled:opacity-60">
                  {pending ? t("otpVerifying") : t("otpVerify")}
                </button>
                <button
                  type="button"
                  className="w-full text-sm font-medium text-[#011B33]"
                  onClick={() => {
                    setSignupSession(null);
                    setOtpCode("");
                    goTo("account", "back");
                  }}
                >
                  {t("otpBack")}
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
