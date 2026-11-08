"use client";

import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/auth/PasswordField";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/navigation";
import { readApiError } from "@/lib/api-error";

type SecurityStatus = {
  email_code_enabled: boolean;
  authenticator_enabled: boolean;
};

function Step({ done, title, detail }: { done: boolean; title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-[#E5F6EC] text-[#1F8A4C]" : "bg-[var(--admin-soft,#e7f1fc)] text-[#1457D0]"
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="admin-muted block text-xs">{detail}</span>
      </span>
    </li>
  );
}

export function AdminSecurity() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/security", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(readApiError(data, "We couldn't load security."));
      return;
    }
    setStatus(data as SecurityStatus);
    setErr(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function startSetup() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/security/authenticator/start", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "We couldn't start authenticator setup."));
        return;
      }
      setSetup(data as { secret: string; otpauth_uri: string });
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/security/authenticator/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "That code was not accepted."));
        return;
      }
      setSetup(null);
      setCode("");
      setMsg("Authenticator is on. System logs are unlocked.");
      await load();
      void refreshUser();
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setPasswordErr(null);
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordErr("New passwords do not match.");
      return;
    }
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (res.status === 204) {
      setPasswordMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }
    const data = await res.json().catch(() => null);
    setPasswordErr(readApiError(data, "We couldn't update your password."));
  }

  const emailOn = status?.email_code_enabled ?? Boolean(user?.two_factor_enabled);
  const authenticatorOn = status?.authenticator_enabled ?? Boolean(user?.authenticator_enabled);
  const groupedSecret = setup?.secret.match(/.{1,4}/g)?.join(" ") ?? "";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.75fr)]">
      <div className="space-y-4">
        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">Admin onboarding</h2>
          <p className="admin-muted mt-1 text-sm">Finish the authenticator step before opening system logs.</p>
          <ol className="mt-4 space-y-3">
            <Step done title="Admin account" detail="You are signed in to the console." />
            <Step done={emailOn} title="Email code at sign-in" detail={emailOn ? "On for this account." : "Turn on the email code from account security."} />
            <Step
              done={authenticatorOn}
              title="Authenticator app"
              detail={authenticatorOn ? "On. System logs are open." : "Add Multivate to an authenticator app."}
            />
            <Step done={authenticatorOn} title="System logs" detail={authenticatorOn ? "Course and payment activity is available." : "Locked until the authenticator is on."} />
          </ol>
          <Link href="/admin/system-logs" className="mt-4 inline-flex text-sm font-semibold text-[#1457D0]">
            {authenticatorOn ? "Open system logs" : "System logs stay locked"}
          </Link>
        </section>

        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Authenticator</h2>
              <p className="admin-muted mt-1 text-sm">A 6-digit code from an authenticator app, on top of your password.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${authenticatorOn ? "bg-[#E5F6EC] text-[#1F8A4C]" : "bg-[#FFF4DE] text-[#A56B00]"}`}>
              {authenticatorOn ? "On" : "Off"}
            </span>
          </div>
          {authenticatorOn ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E5F6EC] px-3 py-2 text-sm text-[#1F8A4C]">
              <ShieldCheck className="h-4 w-4" />
              Your authenticator is on. System logs are unlocked.
            </p>
          ) : setup ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm">Add this key in your authenticator app, then enter the 6-digit code.</p>
              <p className="rounded-xl bg-[var(--admin-soft,#e7f1fc)] px-3 py-2 font-mono text-sm tracking-wide">{groupedSecret}</p>
              <label className="block text-sm font-semibold">
                Code from the app
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="mt-1.5 w-full max-w-xs rounded-lg border border-[var(--admin-line)] bg-[var(--admin-bg)] px-3 py-2.5 text-sm outline-none focus:border-[#1457D0]"
                />
              </label>
              <button
                type="button"
                disabled={busy || code.trim().length < 6}
                onClick={() => void confirmSetup()}
                className="rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirm authenticator
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || status === null}
              onClick={() => void startSetup()}
              className="mt-4 rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Set up authenticator
            </button>
          )}
          {msg ? <p className="mt-3 text-sm font-medium text-[#1F8A4C]">{msg}</p> : null}
          {err ? <p className="mt-3 text-sm font-medium text-red-700">{err}</p> : null}
        </section>

        <section className="admin-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-semibold">Change password</h2>
          <p className="admin-muted mt-1 text-sm">Updates the password for this admin account.</p>
          {passwordErr ? <p className="mt-3 text-sm font-medium text-red-700">{passwordErr}</p> : null}
          {passwordMsg ? <p className="mt-3 text-sm font-medium text-[#1F8A4C]">{passwordMsg}</p> : null}
          <div className="mt-4 max-w-md space-y-4">
            <PasswordField variant="console" label="Current password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordField variant="console" label="New password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" />
            <PasswordField variant="console" label="Confirm new password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} placeholder="At least 8 characters" />
            <button type="button" onClick={() => void savePassword()} className="rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white">
              Update password
            </button>
          </div>
        </section>
      </div>

      <aside className="admin-card h-fit overflow-visible rounded-2xl p-5">
        <div className="flex items-center gap-4 overflow-visible">
          <PersonMark name={user?.name || "Admin"} className="h-14 w-14 text-base" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{user?.name}</p>
            <p className="admin-muted truncate text-xs">{user?.email}</p>
            <span className="mt-1 inline-flex rounded-full bg-[#FFF1E4] px-2.5 py-1 text-xs font-semibold text-[#C56A1A]">Admin</span>
          </div>
        </div>
        <p className="admin-muted mt-5 text-[11px] font-semibold uppercase tracking-[0.12em]">What you can do</p>
        <ul className="mt-2 space-y-2 text-sm">
          {["Accounts and profiles", "Courses and reviews", "Payments and enrollments", authenticatorOn ? "System logs" : "System logs, after authenticator"].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#1F8A4C]" />
              {item}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
