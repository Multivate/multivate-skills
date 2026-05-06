"use client";

import { Mail, User, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { AUTH_IMAGES } from "@/components/auth/auth-media";
import { AuthBrandBlock, AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthSelect } from "@/components/auth/AuthSelect";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/navigation";
import type { UserRole } from "@/types/user";

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"" | Exclude<UserRole, "admin">>("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) {
      setError(t("errRole"));
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
      await register({ name: name.trim(), email: email.trim(), password, role });
      setSuccess(true);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGeneric"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthSplitLayout
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
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">{t("title")}</h2>
          <p className="mt-1.5 text-sm text-slate-600">{t("subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
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

            <AuthSelect id="role" label={t("roleLabel")} icon={Users} value={role} onChange={(v) => setRole(v as typeof role)}>
              <option value="" disabled>
                {t("rolePlaceholder")}
              </option>
              <option value="student">{t("roleStudent")}</option>
              <option value="instructor">{t("roleInstructor")}</option>
            </AuthSelect>

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

            <button type="submit" disabled={pending} className="btn-cta-accent">
              {pending ? t("submitting") : t("submit")}
            </button>
          </form>

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
