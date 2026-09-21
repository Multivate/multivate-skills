"use client";

import { Clock, GraduationCap, Mail, MessageSquareText, Target, User, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
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
import { hardNavigate } from "@/lib/auth-navigation";
import type { UserRole } from "@/types/user";

const TOTAL_STEPS = 4;

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tLogin = useTranslations("auth.login");
  const locale = useLocale();
  const tLearn = useTranslations("dashboard.learningProfile");
  const tTeach = useTranslations("dashboard.teachingProfile");
  const { registerStart, registerVerify, user, loading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"" | "student" | "instructor" | "mentor">("");
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


  useEffect(() => {
    if (loading || !user || !pathname.includes("/register")) return;
    hardNavigate("/dashboard", locale);
  }, [loading, user, locale, pathname]);

  useEffect(() => {
    const intent = searchParams.get("intent");
    if (intent === "instructor" || intent === "teach") {
      setRole((r) => (r === "" ? "instructor" : r));
    }
  }, [searchParams]);

  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (!oauthError) return;
    if (oauthError === "cancelled") {
      setError(tLogin("oauthCancelled"));
    } else if (oauthError === "unavailable") {
      setError(t("oauthUnavailable"));
    } else {
      setError(tLogin("oauthError"));
    }
  }, [searchParams, t, tLogin]);

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
    if (role === "mentor") {
      return true;
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
    if (role === "mentor") {
      setStep(3);
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
      const startPayload: import("@/services/auth").RegisterPayload =
        role === "student"
          ? {
              role: "student",
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
          : role === "instructor"
            ? {
                role: "instructor",
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
              }
            : {
                role: "mentor",
                name: name.trim(),
                email: email.trim(),
                password,
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
      hardNavigate("/dashboard", locale);
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
    "inline-flex min-h-[2.75rem] items-center justify-center rounded-md border border-brand-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-ink hover:bg-brand-ink hover:text-white";

  const formTitle =
    step === 4
      ? t("otpTitle")
      : step === 2
        ? role === "instructor"
          ? t("instructorBlockTitle")
          : t("studentBlockTitle")
        : t("title");

  return (
    <AuthSplitLayout
      formMaxWidthClass="max-w-xl"
      coverPhoto={{
        src: AUTH_IMAGES.registerHero,
        alt: t("heroAlt"),
        objectClassName: "object-cover object-[center_48%]",
      }}
      brand={
        <AuthBrandBlock
          badge={t("badge")}
          title={
            <>
              {t("brandTitle")}{" "}
              <span className="text-brand-accent">{t("brandTitleHighlight")}</span>.
            </>
          }
          description={t("brandDesc")}
        />
      }
      form={
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <p className="tag-overline">{step === 4 ? t("otpTitle") : t("badge")}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tighter text-brand-ink sm:text-[2rem]">
            {formTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-ink/65">
            {step === 4 && signupSession ? t("otpSubtitle", { email: signupSession.masked }) : stepHint}
          </p>
          <div className="mt-6" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-ink/45">
              {t("stepProgress", { current: step, total: TOTAL_STEPS })}
            </p>
            <div className="mt-2.5 flex gap-1.5" aria-hidden>
              {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full ${index < step ? "bg-brand-accent" : "bg-brand-ink/10"}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {success ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {t("success")}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}

            {step === 1 ? (
              <div className="space-y-6">
                <AuthSelect
                  id="role"
                  label={t("roleLabel")}
                  icon={Users}
                  value={role}
                  onChange={(v) => {
                    setRole(v as typeof role);
                    setError(null);
                  }}
                >
                  <option value="" disabled>
                    {t("rolePlaceholder")}
                  </option>
                  <option value="student">{t("roleStudent")}</option>
                  <option value="instructor">{t("roleInstructor")}</option>
                  <option value="mentor">Mentor</option>
                </AuthSelect>

                <div>
                  <p className="mb-3 text-xs leading-relaxed text-brand-ink/55">{t("oauthRoleHint")}</p>
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center" aria-hidden>
                      <div className="w-full border-t border-neutral-200 dark:border-zinc-700" />
                    </div>
                    <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wide text-brand-ink/45">
                      <span className="bg-brand-paper px-3">{tLogin("divider")}</span>
                    </div>
                  </div>
                  <AuthSocialButtons
                    returnTo="/dashboard"
                    locale={locale}
                    disabled={pending}
                    role={role}
                    requireRole
                    errorTo="/register"
                    onNeedRole={() => setError(t("oauthPickRole"))}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button type="button" onClick={goNextFromStep1} className="btn-cta-accent min-h-[2.75rem] px-8">
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 && role === "student" ? (
              <div className="space-y-6">
                <AuthSelect
                  id="reg_education_level"
                  label={tLearn("educationLabel")}
                  icon={GraduationCap}
                  required
                  value={educationLevel}
                  onChange={setEducationLevel}
                >
                  <option value="">{tLearn("educationOptPlaceholder")}</option>
                  <option value="secondary">{tLearn("educationOptSecondary")}</option>
                  <option value="vocational">{tLearn("educationOptVocational")}</option>
                  <option value="bachelors">{tLearn("educationOptBachelors")}</option>
                  <option value="masters">{tLearn("educationOptMasters")}</option>
                  <option value="phd">{tLearn("educationOptPhd")}</option>
                  <option value="other">{tLearn("educationOptOther")}</option>
                </AuthSelect>
                <SuggestionChipsField
                  id="reg_skills_to_learn"
                  label={tLearn("skillsToLearnLabel")}
                  icon={Target}
                  required
                  hint={tLearn("skillsToLearnHint")}
                  suggestions={skillsToLearnSuggestions}
                  value={skillsToLearn}
                  onChange={setSkillsToLearn}
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
                />
                <AuthSelect
                  id="reg_weekly_hours"
                  label={tLearn("weeklyHoursLabel")}
                  icon={Clock}
                  required
                  value={weeklyHours}
                  onChange={setWeeklyHours}
                >
                  <option value="">{tLearn("weeklyOptPlaceholder")}</option>
                  <option value="under5">{tLearn("weeklyOptUnder5")}</option>
                  <option value="5to10">{tLearn("weeklyOpt5to10")}</option>
                  <option value="10to15">{tLearn("weeklyOpt10to15")}</option>
                  <option value="15plus">{tLearn("weeklyOpt15plus")}</option>
                </AuthSelect>
                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between">
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
                <SuggestionChipsField
                  id="reg_expertise"
                  label={tTeach("expertiseLabel")}
                  icon={Target}
                  required
                  hint={tTeach("expertiseHint")}
                  suggestions={expertiseSuggestions}
                  value={expertiseAreas}
                  onChange={setExpertiseAreas}
                />
                <AuthSelect
                  id="reg_years"
                  label={tTeach("yearsLabel")}
                  icon={GraduationCap}
                  required
                  value={yearsExperience}
                  onChange={setYearsExperience}
                >
                  <option value="">{tTeach("yearsOptPlaceholder")}</option>
                  <option value="under3">{tTeach("yearsOptUnder3")}</option>
                  <option value="3to5">{tTeach("yearsOpt3to5")}</option>
                  <option value="5to10">{tTeach("yearsOpt5to10")}</option>
                  <option value="10plus">{tTeach("yearsOpt10plus")}</option>
                </AuthSelect>
                <SuggestionChipsField
                  id="reg_teach_formats"
                  label={tTeach("formatsLabel")}
                  icon={MessageSquareText}
                  required
                  hint={tTeach("formatsHint")}
                  suggestions={teachingFormatSuggestions}
                  value={teachingFormats}
                  onChange={setTeachingFormats}
                />
                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between">
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
                <div className="space-y-5">
                  <p className="text-sm font-semibold text-brand-ink">{t("accountSectionTitle")}</p>
                  <div className="grid gap-5 md:grid-cols-2 md:gap-x-6">
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
                </div>

                <label className="flex cursor-pointer items-start gap-3 pt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-brand-panel focus:ring-brand-panel/30"
                  />
                  <span className="text-sm leading-snug text-neutral-500">
                    {t("termsLead")}{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-accent hover:text-brand-accent-dark"
                    >
                      {t("terms")}
                    </Link>{" "}
                    {t("and")}{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-accent hover:text-brand-accent-dark"
                    >
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
                  <p className="rounded-sm border border-brand-secondary/30 bg-brand-secondary/10 px-3 py-2 text-sm text-brand-ink dark:text-neutral-200" role="status">
                    {otpNotice}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("otpSpamHint")}</p>
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

          <p className="mt-8 text-center text-sm text-neutral-500">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-semibold text-brand-accent hover:text-brand-accent-dark">
              {t("signIn")}
            </Link>
          </p>
        </div>
      }
    />
  );
}
