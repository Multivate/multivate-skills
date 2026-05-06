"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardSettingsPage() {
  const { logout, user } = useAuth();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-extrabold text-brand-ink sm:text-xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Account data from your authenticated session.</p>
      </div>
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Signed in as <span className="font-semibold text-slate-900">{user?.name}</span> (
          <span className="font-medium">{user?.email}</span>) · role{" "}
          <span className="font-semibold capitalize">{user?.role}</span>
        </p>
        <Link href="/dashboard/payments" className="mt-4 inline-block text-sm font-semibold text-brand-primary hover:underline">
          View payment history
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace("/");
            router.refresh();
          }}
          className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 lg:hidden"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
