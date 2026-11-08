"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { Upload } from "@/components/ui/Upload";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/contexts/auth-context";
import { readApiError } from "@/lib/api-error";
import { hardNavigate } from "@/lib/auth-navigation";
import type { AuthUser, UserRole } from "@/types/user";

const PREFS_EMAIL = "multivate_prefs_product_email";
const PREFS_REMINDERS = "multivate_prefs_course_reminders";

type Section = "account" | "security" | "preferences" | "billing" | "session";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  instructor: "Instructor",
  mentor: "Mentor",
  student: "Student",
};

const ROLE_PILL: Record<string, string> = {
  student: "bg-[#E7F1FC] text-[#1457D0]",
  instructor: "bg-[#EEE9FF] text-[#5B45D6]",
  mentor: "bg-[#E5F6EC] text-[#1F8A4C]",
  admin: "bg-[#FFF1E4] text-[#C56A1A]",
};

function roleLabel(role: string) {
  return ROLE_LABEL[role] ?? role;
}

export function AccountSettings({ hideHeader = false }: { hideHeader?: boolean }) {
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
    const emailPref = window.localStorage.getItem(PREFS_EMAIL);
    const reminderPref = window.localStorage.getItem(PREFS_REMINDERS);
    if (emailPref !== null) setEmailOptIn(emailPref === "1");
    if (reminderPref !== null) setReminders(reminderPref === "1");
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
  const role = (display?.role ?? user?.role ?? "student") as UserRole | string;
  const showBilling = role === "student" || role === "instructor" || role === "admin";
  const paymentsHref = role === "admin" ? "/admin/payments" : "/dashboard/payments";

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
    "mt-1.5 w-full max-w-md rounded-lg border border-[var(--admin-line,#e3ebf5)] bg-[var(--admin-bg,#fff)] px-4 py-2.5 text-sm admin-ink outline-none focus:border-[#1457D0] focus:ring-2 focus:ring-[#1457D0]/25";

  return (
    <div className={`${hideHeader ? "mx-auto max-w-3xl" : "mx-auto max-w-3xl"} space-y-5`}>
      {hideHeader ? null : (
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="admin-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>
      )}

      {meLoading ? <p className="admin-muted text-sm">{t("refreshing")}</p> : null}
      {meErr ? <p className="text-sm font-medium text-red-700">{meErr}</p> : null}

      {display ? (
        <section className="admin-card flex flex-wrap items-center gap-4 rounded-2xl p-5">
          {display.avatar_url ? (
            <UserAvatar name={display.name} avatarUrl={display.avatar_url} className="h-16 w-16 text-xl" />
          ) : (
            <PersonMark name={display.name} className="h-16 w-16 text-lg" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold">{display.name}</p>
            <p className="admin-muted mt-0.5 truncate text-sm">{display.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_PILL[role] ?? "bg-[#E7F1FC] text-[#1457D0]"}`}>
                {roleLabel(role)}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  display.is_active ? "bg-[#E5F6EC] text-[#1F8A4C]" : "bg-[#FDECEC] text-[#C2414A]"
                }`}
              >
                {display.is_active ? t("statusActive") : t("statusInactive")}
              </span>
            </div>
          </div>
          <p className="admin-muted text-sm">
            {t("fieldMemberSince")} {formatDate(display.created_at)}
          </p>
        </section>
      ) : null}

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--admin-line,#e3ebf5)] bg-[var(--admin-soft,#e7f1fc)] p-1">
        {sections.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${
              section === id ? "admin-card" : "admin-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "account" ? (
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">{t("accountTitle")}</h2>
          <p className="admin-muted mt-1 text-sm">{t("accountSubtitle")}</p>
          {profileErr ? <p className="mt-4 text-sm font-medium text-red-700">{profileErr}</p> : null}
          {profileMsg ? <p className="mt-4 text-sm font-medium text-[#1F8A4C]">{profileMsg}</p> : null}
          <div className="mt-5">
            <p className="text-sm font-semibold">{t("photoLabel")}</p>
            <p className="admin-muted mt-1 text-xs">{t("photoHint")}</p>
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
          <div className="mt-6 border-t border-[var(--admin-line,#e3ebf5)] pt-6">
            <label htmlFor="settings-name" className="text-sm font-semibold">
              {t("editNameLabel")}
            </label>
            <input id="settings-name" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
            <button
              type="button"
              onClick={() => void saveProfile()}
              className="mt-4 rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0E3F9E]"
            >
              {t("saveProfile")}
            </button>
          </div>
          {role === "mentor" ? (
            <p className="admin-muted mt-6 border-t border-[var(--admin-line,#e3ebf5)] pt-6 text-sm">
              Public mentor details are managed separately.{" "}
              <Link href="/dashboard/mentor/profile" className="font-semibold text-[#1457D0]">
                Edit mentor profile
              </Link>
            </p>
          ) : null}
          {role === "instructor" ? (
            <p className="admin-muted mt-6 border-t border-[var(--admin-line,#e3ebf5)] pt-6 text-sm">
              Course content lives in Studio.{" "}
              <Link href="/instructor/studio" className="font-semibold text-[#1457D0]">
                Open Course Studio
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {section === "security" ? (
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">{t("securityTitle")}</h2>
          <p className="admin-muted mt-1 text-sm">{t("securitySubtitle")}</p>
          {passwordErr ? <p className="mt-4 text-sm font-medium text-red-700">{passwordErr}</p> : null}
          {passwordMsg ? <p className="mt-4 text-sm font-medium text-[#1F8A4C]">{passwordMsg}</p> : null}
          <div className="mt-5 max-w-md space-y-4">
            <PasswordField
              variant="console"
              label={t("currentPassword")}
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Current password"
            />
            <PasswordField
              variant="console"
              label={t("newPassword")}
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder={t("newPasswordPh")}
            />
            <PasswordField
              variant="console"
              label={t("confirmPassword")}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t("newPasswordPh")}
            />
            <button
              type="button"
              onClick={() => void savePassword()}
              className="rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0E3F9E]"
            >
              {t("changePassword")}
            </button>
          </div>
        </section>
      ) : null}

      {section === "preferences" ? (
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">{t("preferencesTitle")}</h2>
          <p className="admin-muted mt-1 text-sm">{t("preferencesSubtitle")}</p>
          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--admin-soft,#e7f1fc)] px-4 py-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[var(--admin-line,#e3ebf5)] text-[#1457D0]"
                checked={emailOptIn}
                onChange={(e) => setEmailOptIn(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold">{t("prefEmailUpdates")}</span>
                <span className="admin-muted mt-1 block text-xs">{t("prefEmailUpdatesHint")}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--admin-soft,#e7f1fc)] px-4 py-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[var(--admin-line,#e3ebf5)] text-[#1457D0]"
                checked={reminders}
                onChange={(e) => setReminders(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold">{t("prefCourseReminders")}</span>
                <span className="admin-muted mt-1 block text-xs">{t("prefCourseRemindersHint")}</span>
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={persistPrefs}
                className="rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0E3F9E]"
              >
                {t("savePreferences")}
              </button>
              {prefsSaved ? <span className="text-xs font-semibold text-[#1F8A4C]">{t("savedPrefs")}</span> : null}
            </div>
          </div>
        </section>
      ) : null}

      {section === "billing" && showBilling ? (
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">{t("billingTitle")}</h2>
          <p className="admin-muted mt-1 text-sm">{t("billingSubtitle")}</p>
          <p className="mt-4 text-sm leading-relaxed">{t("billingBody")}</p>
          <Link
            href={paymentsHref}
            className="mt-5 inline-flex rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-[#0E3F9E]"
          >
            {t("openPayments")}
          </Link>
        </section>
      ) : null}

      {section === "session" ? (
        <section className="space-y-4">
          <div className="admin-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-base font-semibold">{t("sessionTitle")}</h2>
            <p className="admin-muted mt-1 text-sm">{t("sessionSubtitle")}</p>
            <p className="mt-4 text-sm leading-relaxed">{t("signOutHint")}</p>
            <button
              type="button"
              onClick={async () => {
                await logout();
                hardNavigate("/", locale);
              }}
              className="mt-5 rounded-lg border border-[var(--admin-line,#e3ebf5)] px-4 py-2.5 text-sm font-semibold"
            >
              {t("signOut")}
            </button>
          </div>
          <div className="admin-alert rounded-2xl px-5 py-4">
            <p className="text-sm font-semibold">{t("dangerTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed">{t("dangerBody")}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
