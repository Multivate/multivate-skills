"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { AuthUser } from "@/types/user";

const PREFS_EMAIL = "multivate_prefs_product_email";
const PREFS_REMINDERS = "multivate_prefs_course_reminders";

type Section = "account" | "preferences" | "billing" | "session";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const e = window.localStorage.getItem(PREFS_EMAIL);
    const r = window.localStorage.getItem(PREFS_REMINDERS);
    if (e !== null) setEmailOptIn(e === "1");
    if (r !== null) setReminders(r === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMeLoading(true);
      setMeErr(null);
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setMeErr(typeof data?.detail === "string" ? data.detail : "Could not load profile.");
          setMe(null);
          return;
        }
        if (data && typeof data === "object" && "email" in data && "role" in data) {
          const u = data as AuthUser;
          setMe(u);
          void refreshUser();
        }
      } catch {
        if (!cancelled) setMeErr("Could not load profile.");
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

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
