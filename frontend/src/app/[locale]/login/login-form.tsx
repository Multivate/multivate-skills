"use client";

import { Apple, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_IMAGES } from "@/components/auth/auth-media";
import { AuthBrandBlock, AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuth } from "@/contexts/auth-context";
import { Link, useRouter } from "@/i18n/navigation";

function GoogleGlyph() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm() {
  const t = useTranslations("auth.login");
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const from = searchParams.get("from") || "/dashboard";

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
      await login(email.trim(), password);
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
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">{t("title")}</h2>
          <p className="mt-1.5 text-sm text-slate-600">{t("subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
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
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-panel focus:ring-brand-panel/30"
                />
                {t("remember")}
              </label>
              <button
                type="button"
                className="text-sm font-semibold text-brand-primary hover:underline"
                onClick={() => {
                  /* Placeholder until password reset flow exists */
                }}
              >
                {t("forgot")}
              </button>
            </div>

            <button type="submit" disabled={pending} className="btn-cta-accent">
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="bg-white px-3">{t("divider")}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button type="button" className="btn-auth-social">
              <GoogleGlyph />
              {t("google")}
            </button>
            <button type="button" className="btn-auth-social">
              <Apple className="h-[18px] w-[18px] text-slate-900" strokeWidth={2} aria-hidden />
              {t("apple")}
            </button>
          </div>

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
