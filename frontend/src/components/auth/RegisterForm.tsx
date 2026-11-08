"use client";

import { GraduationCap, Mail, User, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthPage } from "@/components/auth/AuthPage";
import { AuthSelect } from "@/components/auth/AuthSelect";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import {
  isLearnTarget,
  LearningFields,
  readAuthEmail,
  readRememberedTarget,
  rememberAuthEmail,
  rememberLearning,
  storedLearnTarget,
  type LearnTarget,
} from "@/components/auth/LearningFields";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuth } from "@/contexts/auth-context";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { hardNavigate, homeForRole } from "@/lib/auth-navigation";
import type { UserRole } from "@/types/user";

const submitClass =
  "inline-flex h-[50px] w-full items-center justify-center rounded-[5px] bg-brand-accent px-8 text-[16px] font-medium text-white transition duration-200 hover:bg-brand-accent-dark disabled:opacity-60";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tLogin = useTranslations("auth.login");
  const tLearn = useTranslations("auth.learning");
  const tTeach = useTranslations("dashboard.teachingProfile");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const { registerStart, registerVerify, user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"" | "student" | "instructor" | "mentor">("student");
  const [learn, setLearn] = useState("");
  const [learnWith, setLearnWith] = useState<AppLocale>(locale);
  const [yearsExperience, setYearsExperience] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signupSession, setSignupSession] = useState<{ token: string; masked: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");

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
    if (intent === "instructor" || intent === "teach") {
      setRole("instructor");
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

  function chooseLearnWith(next: AppLocale) {
    setLearnWith(next);
    rememberLearning(learn, next);
    rememberAuthEmail(email);
    if (next === locale) return;
    const qs = searchParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const startPayload: import("@/services/auth").RegisterPayload =
        role === "student"
          ? {
              role: "student",
              name: name.trim(),
              email: email.trim(),
              password,
              learning_profile: {
                education_level: "other",
                current_skills: null,
                skills_to_learn: topic,
                learning_goals: `Learn with ${learnWith}`,
                preferred_formats: "Online (self-paced)",
                weekly_hours: "5to10",
                career_direction: null,
                extra_notes: `learn_with:${learnWith}`,
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

  return (
    <AuthPage>
      <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-normal text-[#011B33]">
        {signupSession ? t("otpTitle") : t("title")}
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-[#011B33]/75">
        {signupSession ? t("otpSubtitle", { email: signupSession.masked }) : t("subtitle")}
      </p>

      {error ? (
        <p className="mt-6 rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {signupSession ? (
        <form onSubmit={onOtpSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-[#011B33]/65">{t("otpSpamHint")}</p>
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
          <button type="submit" disabled={pending} className={submitClass}>
            {pending ? t("otpVerifying") : t("otpVerify")}
          </button>
          <button
            type="button"
            className="w-full text-sm font-medium text-[#011B33] hover:text-brand-accent"
            onClick={() => {
              setSignupSession(null);
              setOtpCode("");
              setError(null);
            }}
          >
            {t("otpBack")}
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <AuthSelect
              id="role"
              label={t("roleLabel")}
              icon={Users}
              required
              value={role}
              onChange={(value) => {
                setRole(value as typeof role);
                setError(null);
              }}
            >
              <option value="student">{t("roleStudent")}</option>
              <option value="instructor">{t("roleInstructor")}</option>
              <option value="mentor">{t("roleMentor")}</option>
            </AuthSelect>

            {role !== "mentor" ? (
              <LearningFields
                learn={learn}
                learnWith={learnWith}
                onLearn={setLearn}
                onLearnWith={chooseLearnWith}
                learnLabel={role === "instructor" ? tLearn("teachLabel") : undefined}
                withLabel={role === "instructor" ? tLearn("teachWithLabel") : undefined}
              />
            ) : null}

            {role === "instructor" ? (
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
            ) : null}

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
            <PasswordField
              label={t("password")}
              autoComplete="new-password"
              required
              value={password}
              onChange={setPassword}
              placeholder={t("passwordPh")}
            />
            <PasswordField
              label={t("confirm")}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={setConfirm}
              placeholder={t("confirmPh")}
            />

            <div className="flex items-start gap-3">
              <input
                id="agree-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
              />
              <p className="text-sm leading-snug text-[#011B33]/75">
                <label htmlFor="agree-terms" className="cursor-pointer">
                  {t("termsLead")}
                </label>{" "}
                <Link href="/terms" className="font-medium text-brand-accent hover:text-brand-accent-dark">
                  {t("terms")}
                </Link>{" "}
                {t("and")}{" "}
                <Link href="/privacy" className="font-medium text-brand-accent hover:text-brand-accent-dark">
                  {t("privacy")}
                </Link>
                .
              </p>
            </div>

            <button type="submit" disabled={pending} className={submitClass}>
              {pending ? t("submittingStart") : t("submit")}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-brand-ink/10" />
            </div>
            <div className="relative flex justify-center text-xs font-medium text-[#011B33]/45">
              <span className="bg-white px-3">{tLogin("divider")}</span>
            </div>
          </div>
          <p className="mb-3 text-sm text-[#011B33]/60">{t("oauthRoleHint")}</p>
          <AuthSocialButtons
            returnTo={role === "instructor" ? "/instructor" : "/dashboard"}
            locale={learnWith}
            disabled={pending}
            role={role}
            requireRole
            errorTo="/register"
            onNeedRole={() => setError(t("oauthPickRole"))}
          />
        </>
      )}

      <p className="mt-6 text-center text-sm text-[#011B33]/70">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-accent hover:text-brand-accent-dark">
          {t("signIn")}
        </Link>
      </p>
    </AuthPage>
  );
}
