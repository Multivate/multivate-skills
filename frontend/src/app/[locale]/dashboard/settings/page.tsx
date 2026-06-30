"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { readApiError } from "@/lib/api-error";
import type { AuthUser } from "@/types/user";

const PREFS_EMAIL = "multivate_prefs_product_email";
const PREFS_REMINDERS = "multivate_prefs_course_reminders";

type Section = "account" | "security" | "preferences" | "billing" | "session";

export default function DashboardSettingsPage() {
  const t = useTranslations("dashboard.settings");
  const { logout, user, refreshUser } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [meErr, setMeErr] = useState<string | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [section, setSection] = useState<Section>("account");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [editName, setEditName] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const e = window.localStorage.getItem(PREFS_EMAIL);
    const r = window.localStorage.getItem(PREFS_REMINDERS);
    if (e !== null) setEmailOptIn(e === "1");
    if (r !== null) setReminders(r === "1");
  }, []);

  useEffect(() => {
    if (!user) {
      setMeLoading(true);
      void refreshUser().finally(() => setMeLoading(false));
      return;
    }
    setMe(user);
    setEditName(user.name);
    setMeLoading(false);
    setMeErr(null);
  }, [user, refreshUser]);

  const display = me ?? user;

  const persistPrefs = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREFS_EMAIL, emailOptIn ? "1" : "0");
    window.localStorage.setItem(PREFS_REMINDERS, reminders ? "1" : "0");
    setPrefsSaved(true);
    window.setTimeout(() => setPrefsSaved(false), 2500);
  }, [emailOptIn, reminders]);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Settings sections">
      {(
        [
          ["account", t("navAccount")],
          ["security", t("navSecurity")],
          ["preferences", t("navPreferences")],
          ["billing", t("navBilling")],
          ["session", t("navSession")],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => setSection(id)}
          className={`rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
            section === id ? "bg-brand-primary text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return iso;
    }
  };

  const avatarSrc = display?.avatar_url ?? null;

  async function saveProfile() {
    setProfileErr(null);
    setProfileMsg(null);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setProfileErr(readApiError(body, "We couldn't update your profile."));
      return;
    }
    setMe(body as AuthUser);
    setProfileMsg(t("profileSaved"));
    void refreshUser();
  }

  async function uploadAvatar(file: File) {
    setAvatarBusy(true);
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/auth/me/avatar", { method: "POST", credentials: "include", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileErr(readApiError(body, "We couldn't upload your photo."));
        return;
      }
      setMe(body as AuthUser);
      setProfileMsg(t("photoSaved"));
      void refreshUser();
    } finally {
      setAvatarBusy(false);
    }
  }

  async function savePassword() {
    setPasswordErr(null);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordErr(t("passwordMismatch"));
      return;
    }
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (res.status === 204) {
      setPasswordMsg(t("passwordSaved"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }
    const body = await res.json().catch(() => null);
    setPasswordErr(readApiError(body, "We couldn't update your password."));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-slate-200/90 pb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{t("subtitle")}</p>
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside className="shrink-0 lg:w-52">{nav}</aside>

        <div className="min-w-0 flex-1 space-y-8">
          {section === "account" && (
            <section className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-sm sm:p-8">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">{t("accountTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600">{t("accountSubtitle")}</p>
              {meLoading ? <p className="mt-6 text-sm text-slate-600">{t("refreshing")}</p> : null}
              {meErr ? <p className="mt-6 text-sm font-medium text-red-800">{meErr}</p> : null}
              {display ? (
                <dl className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("fieldName")}</dt>
                    <dd className="mt-1 text-sm font-semibold text-brand-ink">{display.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("fieldEmail")}</dt>
                    <dd className="mt-1 text-sm font-semibold text-brand-ink">{display.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("fieldRole")}</dt>
                    <dd className="mt-1 text-sm font-semibold capitalize text-brand-ink">{display.role}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("fieldMemberSince")}</dt>
                    <dd className="mt-1 text-sm font-semibold text-brand-ink">{formatDate(display.created_at)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("fieldStatus")}</dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          display.is_active
                            ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80"
                            : "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80"
                        }`}
                      >
                        {display.is_active ? t("statusActive") : t("statusInactive")}
                      </span>
                    </dd>
                  </div>
                </dl>
              ) : !meLoading ? (
                <p className="mt-6 text-sm text-slate-600">Not signed in.</p>
              ) : null}
            </section>
          )}

          {section === "security" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800/90 dark:bg-slate-900">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">{t("securityTitle")}</h2>
                <p className="mt-1 text-sm text-slate-600">{t("securitySubtitle")}</p>
                {profileErr ? <p className="mt-4 text-sm font-medium text-red-800">{profileErr}</p> : null}
                {profileMsg ? <p className="mt-4 text-sm font-medium text-emerald-800">{profileMsg}</p> : null}
                <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
                  <UserAvatar
                    name={display?.name ?? "?"}
                    avatarUrl={avatarSrc}
                    className="h-24 w-24 text-2xl ring-2 ring-brand-secondary/30"
                    fallbackClassName="bg-slate-100 text-brand-secondary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">{t("photoLabel")}</p>
                    <p className="mt-1 text-xs text-slate-500">{t("photoHint")}</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadAvatar(f);
                      }}
                    />
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => fileRef.current?.click()}
                      className="mt-3 rounded-xl border border-brand-secondary/40 bg-brand-secondary/10 px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-secondary/20 active:scale-[0.98]"
                    >
                      {avatarBusy ? t("uploadingPhoto") : t("uploadPhoto")}
                    </button>
                  </div>
                </div>
                <div className="mt-8">
                  <label htmlFor="settings-name" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t("editNameLabel")}
                  </label>
                  <input
                    id="settings-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-secondary/30 focus:border-brand-secondary focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => void saveProfile()}
                    className="btn-primary-brand mt-4 !px-5 !py-2.5 text-sm"
                  >
                    {t("saveProfile")}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800/90 dark:bg-slate-900">
                {passwordErr ? <p className="mb-4 text-sm font-medium text-red-800">{passwordErr}</p> : null}
                {passwordMsg ? <p className="mb-4 text-sm font-medium text-emerald-800">{passwordMsg}</p> : null}
                <div className="space-y-4 max-w-md">
                  <PasswordField
                    label={t("currentPassword")}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    placeholder="Current password"
                  />
                  <PasswordField
                    label={t("newPassword")}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder={t("newPasswordPh")}
                  />
                  <PasswordField
                    label={t("confirmPassword")}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder={t("newPasswordPh")}
                  />
                  <button type="button" onClick={() => void savePassword()} className="btn-primary-brand !px-5 !py-2.5 text-sm">
                    {t("changePassword")}
                  </button>
                </div>
              </div>
            </section>
          )}

          {section === "preferences" && (
            <section className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-sm sm:p-8">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("preferencesTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("preferencesSubtitle")}</p>
              <div className="mt-8 space-y-6">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary dark:border-slate-500 dark:bg-slate-900"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-brand-ink dark:text-slate-100">{t("prefEmailUpdates")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600 dark:text-slate-400">{t("prefEmailUpdatesHint")}</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary dark:border-slate-500 dark:bg-slate-900"
                    checked={reminders}
                    onChange={(e) => setReminders(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-brand-ink dark:text-slate-100">{t("prefCourseReminders")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600 dark:text-slate-400">{t("prefCourseRemindersHint")}</span>
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={persistPrefs} className="btn-primary-brand !px-5 !py-2.5 text-sm">
                    {t("savePreferences")}
                  </button>
                  {prefsSaved ? (
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{t("savedPrefs")}</span>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {section === "billing" && (
            <section className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-sm sm:p-8">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("billingTitle")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("billingSubtitle")}</p>
              <p className="mt-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{t("billingBody")}</p>
              <Link href="/dashboard/payments" className="btn-primary-brand mt-6 inline-flex !no-underline">
                {t("openPayments")}
              </Link>
            </section>
          )}

          {section === "session" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-6 shadow-sm sm:p-8">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t("sessionTitle")}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("sessionSubtitle")}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{t("signOutHint")}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    router.replace("/");
                    router.refresh();
                  }}
                  className="mt-6 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {t("signOut")}
                </button>
              </div>
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-6 sm:p-8">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-amber-900/90">{t("dangerTitle")}</h2>
                <p className="mt-3 text-sm leading-relaxed text-amber-950/90">{t("dangerBody")}</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
