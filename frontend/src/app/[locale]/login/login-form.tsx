"use client";

import { Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_IMAGES } from "@/components/auth/auth-media";
import { AuthBrandBlock, AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuth } from "@/contexts/auth-context";
import { pathnameWithoutLeadingLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { hardNavigate } from "@/lib/auth-navigation";

type SignInMethod = "password" | "code";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const locale = useLocale();
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
    if (!loading && user) {
      hardNavigate(from.startsWith("/") ? from : "/dashboard", locale);
    }
  }, [loading, user, locale, from]);

  function goAfterAuth() {
    hardNavigate(from.startsWith("/") ? from : "/dashboard", locale);
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
    setPending(true);
    try {
      const outcome = await login(email.trim(), password);
      if ("mfaRequired" in outcome && outcome.mfaRequired) {
        applyMfaChallenge(outcome);
        return;
      }
      goAfterAuth();
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
      setMfaNotice(
        next.devOtp ? t("mfaDevOtpBanner", { code: next.devOtp }) : t("mfaSentAgain"),
      );
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
    setPending(true);
    try {
      await completeMfaLogin(mfa.token, mfaCode.trim());
      setMfa(null);
      goAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout
      brand={
        <AuthBrandBlock
          badge={t("badge")}
          title={t("brandTitle")}
          description={t("brandDesc")}
          imageSrc={AUTH_IMAGES.loginHero}
          imageAlt={t("heroAlt")}
        />
      }
      form={
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="tag-overline">{mfa ? t("mfaTitle") : t("badge")}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tighter text-brand-ink sm:text-[2rem]">
            {mfa ? t("mfaTitle") : t("title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-brand-ink/65">
            {mfa
              ? t("mfaSubtitle", { email: mfa.masked || email })
              : method === "code"
                ? t("subtitleCode")
                : t("subtitle")}
          </p>

          {mfa ? (
            <form onSubmit={onMfaSubmit} className="mt-8 space-y-5">
              {mfaNotice ? (
                <p className="rounded-md border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-sm text-brand-ink" role="status">
                  {mfaNotice}
                </p>
              ) : (
                <p className="text-sm text-brand-ink/65">{t("mfaSpamHint")}</p>
              )}
              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
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
              <button type="submit" disabled={pending} className="btn-cta-accent">
                {pending ? t("mfaSubmitting") : t("mfaSubmit")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onMfaResend}
                className="w-full text-sm font-semibold text-brand-accent transition hover:text-brand-accent-dark disabled:opacity-60"
              >
                {pending ? t("mfaSubmitting") : t("mfaSendAgain")}
              </button>
              <button
                type="button"
                className="w-full text-center text-sm font-semibold text-brand-ink hover:underline"
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
              <div
                className="mt-6 grid grid-cols-2 gap-1 rounded-sm border border-brand-ink/10 bg-brand-muted/60 p-1"
                role="tablist"
                aria-label={t("methodLabel")}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "password"}
                  onClick={() => {
                    setMethod("password");
                    setError(null);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    method === "password"
                      ? "bg-brand-paper text-brand-ink shadow-sm"
                      : "text-brand-ink/55 hover:text-brand-ink"
                  }`}
                >
                  {t("methodPassword")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "code"}
                  onClick={() => {
                    setMethod("code");
                    setError(null);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    method === "code"
                      ? "bg-brand-paper text-brand-ink shadow-sm"
                      : "text-brand-ink/55 hover:text-brand-ink"
                  }`}
                >
                  {t("methodCode")}
                </button>
              </div>

              <form
                onSubmit={method === "code" ? onCodeSubmit : onPasswordSubmit}
                className="mt-6 space-y-5"
              >
                {error ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
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
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-ink/80">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-4 w-4 rounded border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
                        />
                        {t("remember")}
                      </label>
                      <Link href="/forgot-password" className="text-sm font-semibold text-brand-accent hover:text-brand-accent-dark">
                        {t("forgot")}
                      </Link>
                    </div>
                  </>
                ) : null}

                <button type="submit" disabled={pending} className="btn-cta-accent">
                  {pending
                    ? method === "code"
                      ? t("submittingCode")
                      : t("submitting")
                    : method === "code"
                      ? t("submitCode")
                      : t("submit")}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-brand-ink/10" />
                </div>
                <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wide text-brand-ink/45">
                  <span className="bg-brand-paper px-3">{t("divider")}</span>
                </div>
              </div>

              <AuthSocialButtons returnTo={from} locale={locale} disabled={pending} />
            </>
          )}

          <p className="mt-8 text-center text-sm text-brand-ink/65">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-brand-accent hover:text-brand-accent-dark">
              {t("signUp")}
            </Link>
          </p>
        </div>
      }
    />
  );
}
