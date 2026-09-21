"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import {
  DashboardPageHeader,
  DashboardPanel,
  DashboardQuietLink,
  DashboardState,
} from "@/components/dashboard/dashboard-ui";
import { Upload } from "@/components/ui/Upload";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { readApiError } from "@/lib/api-error";
import { hardNavigate } from "@/lib/auth-navigation";
import type { AuthUser, UserRole } from "@/types/user";

const PREFS_EMAIL = "multivate_prefs_product_email";
const PREFS_REMINDERS = "multivate_prefs_course_reminders";

type Section = "account" | "security" | "preferences" | "billing" | "session";

const ROLE_EYEBROW: Record<UserRole | string, string> = {
  admin: "Admin",
  instructor: "Instructor",
  mentor: "Mentor",
  student: "Student",
};

function roleLabel(role: string): string {
  return ROLE_EYEBROW[role] ?? role;
}

export default function DashboardSettingsPage() {
  const t = useTranslations("dashboard.settings");
  const { logout, user, refreshUser } = useAuth();
  const locale = useLocale();
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

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
  const role = display?.role ?? user?.role ?? "student";
  const showBilling = role === "student" || role === "instructor" || role === "admin";

  const persistPrefs = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREFS_EMAIL, emailOptIn ? "1" : "0");
    window.localStorage.setItem(PREFS_REMINDERS, reminders ? "1" : "0");
    setPrefsSaved(true);
    window.setTimeout(() => setPrefsSaved(false), 2500);
  }, [emailOptIn, reminders]);

  const sections = (
    [
      ["account", t("navAccount")],
      ["security", t("navSecurity")],
      ["preferences", t("navPreferences")],
      ...(showBilling ? ([["billing", t("navBilling")]] as const) : []),
      ["session", t("navSession")],
    ] as const
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

  const inputClass =
    "mt-2 w-full max-w-md rounded-md border border-brand-ink/15 bg-brand-surface px-4 py-2.5 text-sm text-brand-ink outline-none transition placeholder:text-brand-ink/40 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <DashboardPageHeader
        eyebrow={roleLabel(role)}
        title={t("title")}
        description={t("subtitle")}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <aside className="shrink-0 lg:w-48">
          <nav className="flex gap-1 overflow-x-auto border-b border-brand-ink/10 pb-px lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-l lg:border-brand-ink/10" aria-label="Settings sections">
            {sections.map(([id, label]) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={`shrink-0 border-b-2 px-4 py-3 text-left text-sm font-semibold transition lg:border-b-0 lg:border-l-2 lg:-ml-px ${
                    active
                      ? "border-brand-accent text-brand-ink"
                      : "border-transparent text-brand-ink/55 hover:text-brand-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          {section === "account" && (
            <DashboardPanel title={t("accountTitle")} description={t("accountSubtitle")}>
              {meLoading ? <p className="text-sm text-brand-ink/60">{t("refreshing")}</p> : null}
              {meErr ? <p className="text-sm font-medium text-red-800">{meErr}</p> : null}
              {display ? (
                <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-start">
                  <UserAvatar
                    name={display.name}
                    avatarUrl={avatarSrc}
                    className="h-20 w-20 text-xl"
                    fallbackClassName="bg-brand-ink text-white"
                  />
                  <dl className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">{t("fieldName")}</dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-ink">{display.name}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">{t("fieldEmail")}</dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-ink">{display.email}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">{t("fieldRole")}</dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-ink">{roleLabel(display.role)}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">{t("fieldMemberSince")}</dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-ink">{formatDate(display.created_at)}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">{t("fieldStatus")}</dt>
                      <dd className="mt-2 text-sm font-semibold text-brand-ink">
                        {display.is_active ? t("statusActive") : t("statusInactive")}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : !meLoading ? (
                <DashboardState>Not signed in.</DashboardState>
              ) : null}

              {role === "mentor" ? (
                <p className="mt-8 border-t border-brand-ink/10 pt-6 text-sm text-brand-ink/65">
                  Public mentor details are managed separately.{" "}
                  <DashboardQuietLink href="/dashboard/mentor/profile">Edit mentor profile</DashboardQuietLink>
                </p>
              ) : null}
              {role === "instructor" ? (
                <p className="mt-8 border-t border-brand-ink/10 pt-6 text-sm text-brand-ink/65">
                  Course content lives in Studio.{" "}
                  <DashboardQuietLink href="/dashboard/instructor/studio">Open Course Studio</DashboardQuietLink>
                </p>
              ) : null}
            </DashboardPanel>
          )}

          {section === "security" && (
            <>
              <DashboardPanel title={t("securityTitle")} description={t("securitySubtitle")}>
                {profileErr ? <p className="mb-4 text-sm font-medium text-red-800">{profileErr}</p> : null}
                {profileMsg ? <p className="mb-4 text-sm font-medium text-emerald-800">{profileMsg}</p> : null}

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <UserAvatar
                    name={display?.name ?? "?"}
                    avatarUrl={avatarSrc}
                    className="h-24 w-24 text-2xl"
                    fallbackClassName="bg-brand-ink text-white"
                  />
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">{t("photoLabel")}</p>
                    <p className="mt-1 text-xs leading-relaxed text-brand-ink/55">{t("photoHint")}</p>
                    <Upload
                      folder="avatars"
                      uploadUrl="/api/auth/me/avatar"
                      accept="image/jpeg,image/png,image/webp"
                      label={t("uploadPhoto")}
                      compact
                      className="mt-3"
                      onSuccess={(userResult) => {
                        void refreshUser();
                        setProfileMsg(t("photoSaved"));
                        setMe(userResult);
                      }}
                      onError={(msg) => setProfileErr(msg)}
                    />
                  </div>
                </div>

                <div className="mt-8 border-t border-brand-ink/10 pt-8">
                  <label htmlFor="settings-name" className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">
                    {t("editNameLabel")}
                  </label>
                  <input
                    id="settings-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={inputClass}
                  />
                  <button type="button" onClick={() => void saveProfile()} className="btn-primary-brand mt-4 !min-h-0 !min-w-0 !px-5 !py-2.5 text-sm">
                    {t("saveProfile")}
                  </button>
                </div>
              </DashboardPanel>

              <DashboardPanel title={t("changePassword")} description={t("securitySubtitle")}>
                {passwordErr ? <p className="mb-4 text-sm font-medium text-red-800">{passwordErr}</p> : null}
                {passwordMsg ? <p className="mb-4 text-sm font-medium text-emerald-800">{passwordMsg}</p> : null}
                <div className="max-w-md space-y-4">
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
                  <button type="button" onClick={() => void savePassword()} className="btn-primary-brand !min-h-0 !min-w-0 !px-5 !py-2.5 text-sm">
                    {t("changePassword")}
                  </button>
                </div>
              </DashboardPanel>
            </>
          )}

          {section === "preferences" && (
            <DashboardPanel title={t("preferencesTitle")} description={t("preferencesSubtitle")}>
              <div className="space-y-4">
                <label className="flex cursor-pointer items-start gap-4 border border-brand-ink/10 bg-brand-paper px-4 py-4 transition hover:border-brand-ink/20">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-brand-ink">{t("prefEmailUpdates")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-brand-ink/55">{t("prefEmailUpdatesHint")}</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-4 border border-brand-ink/10 bg-brand-paper px-4 py-4 transition hover:border-brand-ink/20">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-brand-ink/25 text-brand-accent focus:ring-brand-accent/30"
                    checked={reminders}
                    onChange={(e) => setReminders(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-brand-ink">{t("prefCourseReminders")}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-brand-ink/55">{t("prefCourseRemindersHint")}</span>
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button type="button" onClick={persistPrefs} className="btn-primary-brand !min-h-0 !min-w-0 !px-5 !py-2.5 text-sm">
                    {t("savePreferences")}
                  </button>
                  {prefsSaved ? <span className="text-xs font-semibold text-emerald-800">{t("savedPrefs")}</span> : null}
                </div>
              </div>
            </DashboardPanel>
          )}

          {section === "billing" && showBilling && (
            <DashboardPanel title={t("billingTitle")} description={t("billingSubtitle")}>
              <p className="text-sm leading-relaxed text-brand-ink/70">{t("billingBody")}</p>
              <Link href="/dashboard/payments" className="btn-primary-brand mt-6 inline-flex !min-h-0 !min-w-0 !px-5 !py-2.5 text-sm !no-underline">
                {t("openPayments")}
              </Link>
            </DashboardPanel>
          )}

          {section === "session" && (
            <>
              <DashboardPanel title={t("sessionTitle")} description={t("sessionSubtitle")}>
                <p className="text-sm leading-relaxed text-brand-ink/70">{t("signOutHint")}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    hardNavigate("/", locale);
                  }}
                  className="mt-6 inline-flex border border-brand-ink/15 bg-brand-surface px-5 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-ink hover:bg-brand-ink hover:text-white"
                >
                  {t("signOut")}
                </button>
              </DashboardPanel>

              <div className="border border-brand-accent/25 bg-brand-accent/5 px-5 py-6 sm:px-6">
                <p className="font-display text-base font-semibold text-brand-ink">{t("dangerTitle")}</p>
                <p className="mt-2 text-sm leading-relaxed text-brand-ink/70">{t("dangerBody")}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
