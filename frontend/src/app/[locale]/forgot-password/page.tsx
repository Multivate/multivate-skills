"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AUTH_IMAGES } from "@/components/auth/auth-media";
import { AuthBrandBlock, AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordField } from "@/components/auth/PasswordField";
import { Link, useRouter } from "@/i18n/navigation";
import { readApiError } from "@/lib/api-error";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [masked, setMasked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function applyFallbackCode(code: unknown) {
    if (typeof code === "string" && /^\d{6}$/.test(code)) {
      setCode(code);
      setNotice(t("fallbackCode", { code }));
      return true;
    }
    return false;
  }

  async function requestCode(targetEmail: string, isResend = false) {
    setError(null);
    if (!isResend) setNotice(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(readApiError(body, t("startError")));
        return false;
      }
      setResetToken(String(body?.reset_token ?? ""));
      setMasked(String(body?.email_masked ?? targetEmail));
      setCode("");
      setStep("reset");
      if (!applyFallbackCode(body?.dev_otp)) {
        setNotice(isResend ? t("sentAgain") : null);
      }
      return true;
    } catch {
      setError(t("networkError"));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    await requestCode(email);
  }

  async function onResend() {
    await requestCode(email, true);
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_token: resetToken,
          code: code.trim(),
          new_password: newPassword,
        }),
      });
      if (res.status === 204) {
        router.push("/login?reset=1");
        return;
      }
      const body = await res.json().catch(() => null);
      setError(readApiError(body, t("resetError")));
    } catch {
      setError(t("networkError"));
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
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-8 dark:border-slate-800/90 dark:bg-slate-900">
          <h2 className="text-xl font-extrabold tracking-tight text-brand-ink dark:text-slate-100">
            {step === "email" ? t("title") : t("resetTitle")}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {step === "email" ? t("subtitle") : t("resetSubtitle", { email: masked || email })}
          </p>

          {step === "email" ? (
            <form onSubmit={onStart} className="mt-8 space-y-5">
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <AuthInput
                id="reset-email"
                label={t("email")}
                icon={Mail}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={setEmail}
                placeholder={t("emailPh")}
              />
              <button type="submit" disabled={pending} className="btn-cta-accent">
                {pending ? t("sending") : t("sendCode")}
              </button>
            </form>
          ) : (
            <form onSubmit={onReset} className="mt-8 space-y-5">
              {notice ? (
                <p className="rounded-lg border border-brand-secondary/30 bg-brand-secondary/10 px-3 py-2 text-sm text-brand-ink dark:text-slate-200" role="status">
                  {notice}
                </p>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("spamHint")}</p>
              )}
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              ) : null}
              <AuthInput
                id="reset-code"
                label={t("codeLabel")}
                icon={Mail}
                type="text"
                inputMode="numeric"
                required
                value={code}
                onChange={setCode}
                placeholder={t("codePh")}
              />
              <PasswordField
                label={t("newPassword")}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={setNewPassword}
                placeholder={t("newPasswordPh")}
              />
              <button type="submit" disabled={pending} className="btn-cta-accent">
                {pending ? t("saving") : t("savePassword")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onResend}
                className="w-full text-sm font-semibold text-brand-secondary transition hover:text-brand-primary disabled:opacity-60"
              >
                {pending ? t("sending") : t("sendAgain")}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-slate-600">
            <Link href="/login" className="font-semibold text-brand-primary hover:underline">
              {t("backLogin")}
            </Link>
          </p>
        </div>
      }
    />
  );
}
