"use client";

import { Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthPage } from "@/components/auth/AuthPage";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { readAuthEmail, rememberAuthEmail } from "@/components/auth/LearningFields";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuth } from "@/contexts/auth-context";
import { pathnameWithoutLeadingLocale, type AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { hardNavigate, resolvePostLoginPath } from "@/lib/auth-navigation";

type SignInMethod = "password" | "code";

const submitClass =
  "inline-flex h-[50px] w-full items-center justify-center rounded-[5px] bg-brand-accent px-8 text-[16px] font-medium text-white transition duration-200 hover:bg-brand-accent-dark disabled:opacity-60";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const locale = useLocale() as AppLocale;
  const { login, startCodeLogin, completeMfaLogin, resendMfaLogin, user, loading } = useAuth();
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<SignInMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mfa, setMfa] = useState<{ token: string; masked: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaNotice, setMfaNotice] = useState<string | null>(null);

  const from = pathnameWithoutLeadingLocale(searchParams.get("from") || "/dashboard");
  const holdRedirect = useRef(false);

  useEffect(() => {
    const savedEmail = readAuthEmail();
    if (savedEmail) setEmail(savedEmail);
  }, []);

  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (!oauthError) return;
    if (oauthError === "cancelled") {
      setError(t("oauthCancelled"));
    } else if (oauthError === "unavailable") {
      setError(t("oauthUnavailable"));
    } else {
      setError(t("oauthError"));
    }
  }, [searchParams, t]);

  useEffect(() => {
    if (loading || !user || holdRedirect.current) return;
    hardNavigate(resolvePostLoginPath(user.role, from), locale);
  }, [loading, user, locale, from]);

  function goAfterAuth(role: string) {
    if (remember) rememberAuthEmail(email.trim());
    hardNavigate(resolvePostLoginPath(role, from), locale);
  }

  function applyMfaChallenge(outcome: { mfaToken: string; emailMasked: string; devOtp?: string }) {
    setMfa({
      token: outcome.mfaToken,
      masked: outcome.emailMasked,
    });
    setMfaCode(outcome.devOtp ?? "");
    setMfaNotice(outcome.devOtp ? t("mfaDevOtpBanner", { code: outcome.devOtp }) : null);
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    holdRedirect.current = true;
    setPending(true);
    try {
      const outcome = await login(email.trim(), password);
      if ("mfaRequired" in outcome) {
        holdRedirect.current = false;
        applyMfaChallenge(outcome);
        return;
      }
      await goAfterAuth(outcome.role);
    } catch (err) {
      holdRedirect.current = false;
      if (err instanceof Error && err.message === "PROFILE_INCOMPLETE") {
        setError(t("errorProfileIncomplete"));
      } else {
        setError(err instanceof Error ? err.message : t("errorGeneric"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const outcome = await startCodeLogin(email.trim());
      applyMfaChallenge(outcome);
    } catch (err) {
      if (err instanceof Error && err.message === "PROFILE_INCOMPLETE") {
        setError(t("errorProfileIncomplete"));
      } else {
        setError(err instanceof Error ? err.message : t("errorGeneric"));
      }
    } finally {
      setPending(false);
    }
  }

  async function onMfaResend() {
    if (!mfa) return;
    setError(null);
    setMfaNotice(null);
    setPending(true);
    try {
      const next = await resendMfaLogin(mfa.token);
      setMfa({ token: next.mfaToken, masked: next.emailMasked || mfa.masked });
      setMfaCode(next.devOtp ?? "");
      setMfaNotice(next.devOtp ? t("mfaDevOtpBanner", { code: next.devOtp }) : t("mfaSentAgain"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  async function onMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setError(null);
    holdRedirect.current = true;
    setPending(true);
    try {
      const signedIn = await completeMfaLogin(mfa.token, mfaCode.trim());
      setMfa(null);
      await goAfterAuth(signedIn.role);
    } catch (err) {
      holdRedirect.current = false;
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthPage>
      <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-normal text-[#011B33]">
        {mfa ? t("mfaTitle") : t("title")}
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-[#011B33]/75">
        {mfa ? t("mfaSubtitle", { email: mfa.masked || email }) : method === "code" ? t("subtitleCode") : t("subtitle")}
      </p>

      {mfa ? (
        <form onSubmit={onMfaSubmit} className="mt-6 space-y-4">
          {mfaNotice ? (
            <p className="rounded-[5px] border border-brand-accent/30 bg-brand-sky px-3 py-2 text-sm text-[#011B33]" role="status">
              {mfaNotice}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          <AuthInput
            id="mfa-code"
            label={t("mfaCodeLabel")}
            icon={Mail}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={mfaCode}
            onChange={setMfaCode}
            placeholder={t("mfaCodePh")}
          />
          <button type="submit" disabled={pending} className={submitClass}>
            {pending ? t("mfaSubmitting") : t("mfaSubmit")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onMfaResend}
            className="w-full text-sm font-medium text-brand-accent hover:text-brand-accent-dark disabled:opacity-60"
          >
            {t("mfaSendAgain")}
          </button>
          <button
            type="button"
            className="w-full text-sm font-medium text-[#011B33] hover:text-brand-accent"
            onClick={() => {
              setMfa(null);
              setMfaCode("");
              setMfaNotice(null);
              setError(null);
            }}
          >
            {t("mfaBack")}
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={method === "code" ? onCodeSubmit : onPasswordSubmit} className="mt-6 space-y-4">
            {error ? (
              <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {error}
              </p>
            ) : null}

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

            {method === "password" ? (
              <>
                <PasswordField
                  label={t("password")}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={setPassword}
                  placeholder={t("passwordPh")}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#011B33]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
                    />
                    {t("remember")}
                  </label>
                  <Link href="/forgot-password" className="text-sm font-medium text-brand-accent hover:text-brand-accent-dark">
                    {t("forgot")}
                  </Link>
                </div>
              </>
            ) : null}

            <button type="submit" disabled={pending} className={submitClass}>
              {pending
                ? method === "code"
                  ? t("submittingCode")
                  : t("submitting")
                : method === "code"
                  ? t("submitCode")
                  : t("submit")}
            </button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-sm font-medium text-brand-accent hover:text-brand-accent-dark"
            onClick={() => {
              setMethod(method === "code" ? "password" : "code");
              setError(null);
            }}
          >
            {method === "code" ? t("usePassword") : t("useCode")}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-brand-ink/10" />
            </div>
            <div className="relative flex justify-center text-xs font-medium text-[#011B33]/45">
              <span className="bg-white px-3">{t("divider")}</span>
            </div>
          </div>

          <AuthSocialButtons returnTo={from} locale={locale} disabled={pending} />
        </>
      )}

      <p className="mt-6 text-center text-sm text-[#011B33]/70">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand-accent hover:text-brand-accent-dark">
          {t("signUp")}
        </Link>
      </p>
    </AuthPage>
  );
}
