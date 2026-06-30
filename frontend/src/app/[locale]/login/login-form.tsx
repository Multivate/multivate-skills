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
import { Link, useRouter } from "@/i18n/navigation";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const locale = useLocale();
  const { login, completeMfaLogin, resendMfaLogin, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
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
      router.replace(from.startsWith("/") ? from : "/dashboard");
    }
  }, [loading, user, router, from]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const outcome = await login(email.trim(), password);
        if ("mfaRequired" in outcome && outcome.mfaRequired) {
        setMfa({
          token: outcome.mfaToken,
          masked: outcome.emailMasked,
        });
        setMfaCode("");
        setMfaNotice(null);
        return;
      }
      router.replace(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
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
      setMfaCode("");
      setMfaNotice(t("mfaSentAgain"));
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
      router.replace(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
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
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-brand-ink dark:text-slate-100 sm:text-2xl">
            {mfa ? t("mfaTitle") : t("title")}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {mfa ? t("mfaSubtitle", { email: mfa.masked || email }) : t("subtitle")}
          </p>

          {mfa ? (
            <form onSubmit={onMfaSubmit} className="mt-8 space-y-5">
              {mfaNotice ? (
                <p className="rounded-lg border border-brand-secondary/30 bg-brand-secondary/10 px-3 py-2 text-sm text-brand-ink dark:text-slate-200" role="status">
                  {mfaNotice}
                </p>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("mfaSpamHint")}</p>
              )}
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
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
                className="w-full text-sm font-semibold text-brand-secondary transition hover:text-brand-primary disabled:opacity-60"
              >
                {pending ? t("mfaSubmitting") : t("mfaSendAgain")}
              </button>
              <button
                type="button"
                className="w-full text-center text-sm font-semibold text-brand-primary hover:underline"
                onClick={() => {
                  setMfa(null);
                  setMfaCode("");
                  setError(null);
                }}
              >
                {t("mfaBack")}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={onSubmit} className="mt-8 space-y-5">
                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
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
                <PasswordField
                  label={t("password")}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={setPassword}
                  placeholder={t("passwordPh")}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-panel focus:ring-brand-panel/30"
                    />
                    {t("remember")}
                  </label>
                  <Link href="/forgot-password" className="text-sm font-semibold text-brand-primary hover:underline">
                    {t("forgot")}
                  </Link>
                </div>

                <button type="submit" disabled={pending} className="btn-cta-accent">
                  {pending ? t("submitting") : t("submit")}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span className="bg-white px-3 dark:bg-slate-900">{t("divider")}</span>
                </div>
              </div>

              <AuthSocialButtons returnTo={from} locale={locale} disabled={pending} />
            </>
          )}

          <p className="mt-8 text-center text-sm text-slate-600">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-brand-primary hover:underline">
              {t("signUp")}
            </Link>
          </p>
        </div>
      }
    />
  );
}
