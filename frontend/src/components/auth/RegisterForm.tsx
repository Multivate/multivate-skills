"use client";

import { Clock, GraduationCap, Mail, MessageSquareText, Target, User, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { AUTH_IMAGES } from "@/components/auth/auth-media";
import { AuthBrandBlock, AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { AuthSelect } from "@/components/auth/AuthSelect";
import { PasswordField } from "@/components/auth/PasswordField";
import { SuggestionChipsField } from "@/components/auth/SuggestionChipsField";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/navigation";
import type { UserRole } from "@/types/user";

const TOTAL_STEPS = 4;

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tLogin = useTranslations("auth.login");
  const locale = useLocale();
  const tLearn = useTranslations("dashboard.learningProfile");
  const tTeach = useTranslations("dashboard.teachingProfile");
  const { registerStart, registerVerify, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"" | Exclude<UserRole, "admin">>("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [signupSession, setSignupSession] = useState<{ token: string; masked: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  const [educationLevel, setEducationLevel] = useState("");
  const [skillsToLearn, setSkillsToLearn] = useState("");
  const [preferredFormats, setPreferredFormats] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");

  const [expertiseAreas, setExpertiseAreas] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [teachingFormats, setTeachingFormats] = useState("");

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-ink outline-none transition placeholder:text-slate-400 focus:border-brand-panel focus:ring-2 focus:ring-brand-panel/25";
  const labelClass = "block text-sm font-semibold text-slate-800";

  useEffect(() => {
    if (loading || !user || !pathname.includes("/register")) return;
    router.replace("/dashboard");
  }, [loading, user, router, pathname]);

  useEffect(() => {
    const intent = searchParams.get("intent");
    if (intent === "instructor" || intent === "teach") {
      setRole((r) => (r === "" ? "instructor" : r));
    }
  }, [searchParams]);

  const skillsToLearnSuggestions = useMemo(
    () =>
      [
        tLearn("skillSuggestAi"),
        tLearn("skillSuggestCloud"),
        tLearn("skillSuggestData"),
        tLearn("skillSuggestGerman"),
        tLearn("skillSuggestWeb"),
        tLearn("skillSuggestDesign"),
        tLearn("skillSuggestCyber"),
        tLearn("skillSuggestCareer"),
        tLearn("skillSuggestCert"),
        tLearn("skillSuggestBusinessGerman"),
      ],
    [tLearn],
  );

  const preferredFormatSuggestions = useMemo(
    () =>
      [
        tLearn("formatSuggestOnline"),
        tLearn("formatSuggestLiveOnline"),
        tLearn("formatSuggestInPerson"),
        tLearn("formatSuggestHybrid"),
        tLearn("formatSuggestVideo"),
        tLearn("formatSuggestProjects"),
        tLearn("formatSuggestLiveQa"),
        tLearn("formatSuggestCohort"),
      ],
    [tLearn],
  );

  const teachingFormatSuggestions = useMemo(
    () =>
      [
        tTeach("teachFormatLiveOnline"),
        tTeach("teachFormatSelfPaced"),
        tTeach("teachFormatInPerson"),
        tTeach("teachFormatHybrid"),
        tTeach("teachFormatCohort"),
        tTeach("teachFormatMentoring"),
        tTeach("teachFormatProjects"),
        tTeach("teachFormatOfficeHours"),
      ],
    [tTeach],
  );

  const expertiseSuggestions = useMemo(
    () =>
      [
        tTeach("expertiseSuggestAi"),
        tTeach("expertiseSuggestCloud"),
        tTeach("expertiseSuggestData"),
        tTeach("expertiseSuggestGerman"),
        tTeach("expertiseSuggestWeb"),
        tTeach("expertiseSuggestDesign"),
        tTeach("expertiseSuggestCyber"),
        tTeach("expertiseSuggestCareer"),
        tTeach("expertiseSuggestCert"),
        tTeach("expertiseSuggestBusinessGerman"),
      ],
    [tTeach],
  );

  function validateQuestionnaire(): boolean {
    if (!role) {
      setError(t("errRole"));
      return false;
    }
    if (role === "student") {
      if (!educationLevel.trim()) {
        setError(t("errEducation"));
        return false;
      }
      if (!skillsToLearn.trim()) {
        setError(tLearn("requiredSkillsToLearn"));
        return false;
      }
      if (!preferredFormats.trim()) {
        setError(t("errPreferredFormats"));
        return false;
      }
      if (!weeklyHours.trim()) {
        setError(tLearn("weeklyOptPlaceholder"));
        return false;
      }
    } else {
      if (!expertiseAreas.trim()) {
        setError(tTeach("requiredExpertise"));
        return false;
      }
      if (!yearsExperience.trim()) {
        setError(tTeach("requiredYears"));
        return false;
      }
      if (!teachingFormats.trim()) {
        setError(tTeach("requiredTeachingFormats"));
        return false;
      }
    }
    return true;
  }

  function goNextFromStep1() {
    setError(null);
    if (!role) {
      setError(t("errRole"));
      return;
    }
    setStep(2);
  }

  function goNextFromStep2() {
    setError(null);
    if (!validateQuestionnaire()) return;
    setStep(3);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateQuestionnaire()) return;
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
      const startPayload =
        role === "student"
          ? {
              role: "student" as const,
              name: name.trim(),
              email: email.trim(),
              password,
              learning_profile: {
                education_level: educationLevel.trim(),
                current_skills: null,
                skills_to_learn: skillsToLearn.trim(),
                learning_goals: null,
                preferred_formats: preferredFormats.trim(),
                weekly_hours: weeklyHours.trim(),
                career_direction: null,
                extra_notes: null,
              },
            }
          : {
              role: "instructor" as const,
              name: name.trim(),
              email: email.trim(),
              password,
              teaching_profile: {
                expertise_areas: expertiseAreas.trim(),
                teaching_bio: null,
                subjects_taught: null,
                years_experience: yearsExperience.trim(),
                teaching_formats: teachingFormats.trim(),
                credentials_notes: null,
                professional_links: null,
              },
            };
      const started = await registerStart(startPayload);
      const masked = started.email_masked?.trim() ? started.email_masked : email.trim();
      setSignupSession({
        token: started.signup_token,
        masked,
      });
      setOtpCode("");
      setOtpNotice(null);
      setStep(4);
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
      setSignupSession(null);
      setOtpCode("");
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGeneric"));
    } finally {
      setPending(false);
    }
  }

  function clearOtpAndBackToAccount() {
    setSignupSession(null);
    setOtpCode("");
    setError(null);
    setStep(3);
  }

  const stepHint =
    step === 1
      ? t("step1Hint")
      : step === 2
        ? t("step2Hint")
        : step === 3
          ? t("step3Hint")
          : t("step4Hint");

  const navBtnClass =
    "inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-brand-ink shadow-sm transition hover:border-slate-300 hover:bg-slate-50";

  const questionnaireShell =
    "grid gap-6 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 sm:p-6 md:grid-cols-2 md:gap-x-8 md:gap-y-6";
  const qSpan2 = "md:col-span-2";

  return (
    <AuthSplitLayout
      formMaxWidthClass="max-w-2xl xl:max-w-3xl"
      brand={
        <AuthBrandBlock
          badge={t("badge")}
          title={
            <>
              {t("brandTitle")}{" "}
              <span className="text-indigo-200">{t("brandTitleHighlight")}</span>.
            </>
          }
          description={t("brandDesc")}
          imageSrc={AUTH_IMAGES.registerHero}
          imageAlt={t("heroAlt")}
          heroFraming="register-group"
        />
      }
      form={
        <div className="flex min-h-0 w-full flex-1 flex-col rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-card sm:p-8 lg:p-10">
          <h2 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">
            {step === 4 ? t("otpTitle") : t("title")}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            {step === 4 && signupSession
              ? t("otpSubtitle", { email: signupSession.masked })
              : t("subtitle")}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500" aria-live="polite">
            {t("stepProgress", { current: step, total: TOTAL_STEPS })}
          </p>
          <p className="mt-1 text-sm text-slate-600">{stepHint}</p>

          <div className="mt-6 space-y-6">
            {success ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {t("success")}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}

            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden>
                      <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <span className="bg-white px-3 dark:bg-slate-900">{tLogin("divider")}</span>
                    </div>
                  </div>
                  <AuthSocialButtons returnTo="/dashboard" locale={locale} disabled={pending} />
                </div>
                <AuthSelect id="role" label={t("roleLabel")} icon={Users} value={role} onChange={(v) => setRole(v as typeof role)}>
                  <option value="" disabled>
                    {t("rolePlaceholder")}
                  </option>
                  <option value="student">{t("roleStudent")}</option>
                  <option value="instructor">{t("roleInstructor")}</option>
                </AuthSelect>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={goNextFromStep1} className="btn-cta-accent min-h-[2.75rem] px-8">
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 && role === "student" ? (
              <div className="space-y-6">
                <div className={questionnaireShell}>
                  <p className={`text-sm font-bold text-brand-ink ${qSpan2}`}>{t("studentBlockTitle")}</p>
                  <div className={`flex items-start gap-3 border-b border-slate-200 pb-4 ${qSpan2}`}>
                    <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{tLearn("sectionBackground")}</h3>
                      <label htmlFor="reg_education_level" className={labelClass}>
                        {tLearn("educationLabel")} <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="reg_education_level"
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">{tLearn("educationOptPlaceholder")}</option>
                        <option value="secondary">{tLearn("educationOptSecondary")}</option>
                        <option value="vocational">{tLearn("educationOptVocational")}</option>
                        <option value="bachelors">{tLearn("educationOptBachelors")}</option>
                        <option value="masters">{tLearn("educationOptMasters")}</option>
                        <option value="phd">{tLearn("educationOptPhd")}</option>
                        <option value="other">{tLearn("educationOptOther")}</option>
                      </select>
                    </div>
                  </div>
                  <SuggestionChipsField
                    id="reg_skills_to_learn"
                    label={tLearn("skillsToLearnLabel")}
                    icon={Target}
                    required
                    hint={tLearn("skillsToLearnHint")}
                    suggestions={skillsToLearnSuggestions}
                    value={skillsToLearn}
                    onChange={setSkillsToLearn}
                    className={qSpan2}
                  />
                  <SuggestionChipsField
                    id="reg_preferred_formats"
                    label={tLearn("preferredFormatsLabel")}
                    icon={MessageSquareText}
                    required
                    hint={tLearn("preferredFormatsHint")}
                    suggestions={preferredFormatSuggestions}
                    value={preferredFormats}
                    onChange={setPreferredFormats}
                    className={qSpan2}
                  />
                  <div className={qSpan2}>
                    <label htmlFor="reg_weekly_hours" className={`${labelClass} flex items-center gap-2`}>
                      <Clock className="h-4 w-4 text-brand-primary" aria-hidden />
                      {tLearn("weeklyHoursLabel")} <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="reg_weekly_hours"
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{tLearn("weeklyOptPlaceholder")}</option>
                      <option value="under5">{tLearn("weeklyOptUnder5")}</option>
                      <option value="5to10">{tLearn("weeklyOpt5to10")}</option>
                      <option value="10to15">{tLearn("weeklyOpt10to15")}</option>
                      <option value="15plus">{tLearn("weeklyOpt15plus")}</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep(1)} className={navBtnClass}>
                    {t("back")}
                  </button>
                  <button type="button" onClick={goNextFromStep2} className="btn-cta-accent min-h-[2.75rem] px-8 sm:ml-auto">
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 && role === "instructor" ? (
              <div className="space-y-6">
                <div className={questionnaireShell}>
                  <p className={`text-sm font-bold text-brand-ink ${qSpan2}`}>{t("instructorBlockTitle")}</p>
                  <SuggestionChipsField
                    id="reg_expertise"
                    label={tTeach("expertiseLabel")}
                    icon={Target}
                    required
                    hint={tTeach("expertiseHint")}
                    suggestions={expertiseSuggestions}
                    value={expertiseAreas}
                    onChange={setExpertiseAreas}
                    className={qSpan2}
                  />
                  <div className={qSpan2}>
                    <label htmlFor="reg_years" className={`${labelClass} flex items-center gap-2`}>
                      <GraduationCap className="h-4 w-4 text-brand-primary" aria-hidden />
                      {tTeach("yearsLabel")} <span className="text-red-600">*</span>
                    </label>
                    <select id="reg_years" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className={inputClass}>
                      <option value="">{tTeach("yearsOptPlaceholder")}</option>
                      <option value="under3">{tTeach("yearsOptUnder3")}</option>
                      <option value="3to5">{tTeach("yearsOpt3to5")}</option>
                      <option value="5to10">{tTeach("yearsOpt5to10")}</option>
                      <option value="10plus">{tTeach("yearsOpt10plus")}</option>
                    </select>
                  </div>
                  <SuggestionChipsField
                    id="reg_teach_formats"
                    label={tTeach("formatsLabel")}
                    icon={MessageSquareText}
                    required
                    hint={tTeach("formatsHint")}
                    suggestions={teachingFormatSuggestions}
                    value={teachingFormats}
                    onChange={setTeachingFormats}
                    className={qSpan2}
                  />
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep(1)} className={navBtnClass}>
                    {t("back")}
                  </button>
                  <button type="button" onClick={goNextFromStep2} className="btn-cta-accent min-h-[2.75rem] px-8 sm:ml-auto">
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid gap-5 border-t border-slate-100 pt-2 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
                  <p className={`text-sm font-bold text-brand-ink ${qSpan2}`}>{t("accountSectionTitle")}</p>
                  <div className="min-w-0">
                    <AuthInput
                      id="name"
                      label={t("name")}
                      icon={User}
                      autoComplete="name"
                      required
                      value={name}
                      onChange={setName}
                      placeholder={t("namePh")}
                    />
                  </div>
                  <div className="min-w-0">
                    <AuthInput
                      id="email"
                      label={t("email")}
                      icon={Mail}
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={setEmail}
                      placeholder={t("emailPh")}
                    />
                  </div>
                  <div className="min-w-0">
                    <PasswordField
                      label={t("password")}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={setPassword}
                      placeholder={t("passwordPh")}
                    />
                  </div>
                  <div className="min-w-0">
                    <PasswordField
                      label={t("confirm")}
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={setConfirm}
                      placeholder={t("confirmPh")}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 pt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-panel focus:ring-brand-panel/30"
                  />
                  <span className="text-sm leading-snug text-slate-600">
                    {t("termsLead")}{" "}
                    <Link href="/terms" className="font-semibold text-brand-primary hover:underline">
                      {t("terms")}
                    </Link>{" "}
                    {t("and")}{" "}
                    <Link href="/privacy" className="font-semibold text-brand-primary hover:underline">
                      {t("privacy")}
                    </Link>
                    .
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep(2)} className={navBtnClass}>
                    {t("back")}
                  </button>
                  <button type="submit" disabled={pending} className="btn-cta-accent min-h-[2.75rem] px-8 sm:ml-auto">
                    {pending ? t("submittingStart") : t("submit")}
                  </button>
                </div>
              </form>
            ) : null}

            {step === 4 && signupSession ? (
              <form onSubmit={onOtpSubmit} className="space-y-6">
                {otpNotice ? (
                  <p className="rounded-lg border border-brand-secondary/30 bg-brand-secondary/10 px-3 py-2 text-sm text-brand-ink dark:text-slate-200" role="status">
                    {otpNotice}
                  </p>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("otpSpamHint")}</p>
                )}
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
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={clearOtpAndBackToAccount} className={navBtnClass}>
                    {t("otpBack")}
                  </button>
                  <button type="submit" disabled={pending} className="btn-cta-accent min-h-[2.75rem] px-8 sm:ml-auto">
                    {pending ? t("otpVerifying") : t("otpVerify")}
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          <p className="mt-8 text-center text-sm text-slate-600">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-brand-primary hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </div>
      }
    />
  );
}
