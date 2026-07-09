"use client";

import { Link } from "@/i18n/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { readApiError } from "@/lib/api-error";
import { resolveAvatarUrl } from "@/lib/avatar-url";

type Profile = {
  slug: string;
  full_name: string;
  headline: string;
  bio: string;
  photo_url: string | null;
  city: string;
  origin_country: string | null;
  years_in_germany: number | null;
  expertise_areas: string;
  languages_spoken: string;
  approval_status: string;
  rejection_reason: string | null;
  is_featured: boolean;
  approved_at: string | null;
};

type Conversation = {
  id: string;
  visitor_name: string;
  last_message_preview: string | null;
  unread_count: number;
  last_message_at: string;
};

function profileCompletion(profile: Profile): number {
  const checks = [
    Boolean(profile.photo_url),
    profile.full_name.trim().length >= 2,
    profile.headline.trim().length >= 4,
    profile.bio.trim().length >= 80,
    profile.city.trim().length >= 2,
    profile.years_in_germany != null,
    profile.expertise_areas.trim().length >= 4,
    profile.languages_spoken.trim().length >= 2,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function statusLabel(status: string): string {
  if (status === "approved") return "Live";
  if (status === "pending") return "In review";
  if (status === "rejected") return "Needs updates";
  return "Draft";
}

function CompletionRing({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#F27D0C"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-extrabold tabular-nums text-brand-ink">{pct}%</span>
      </div>
    </div>
  );
}

export function MentorDashboardHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, inboxRes] = await Promise.all([
          fetch("/api/mentor/profile", { credentials: "include", cache: "no-store" }),
          fetch("/api/mentor/conversations", { credentials: "include", cache: "no-store" }),
        ]);
        const profileData = await profileRes.json().catch(() => null);
        const inboxData = await inboxRes.json().catch(() => null);
        if (cancelled) return;
        if (!profileRes.ok) {
          setError(readApiError(profileData, "We couldn't load your workspace."));
          return;
        }
        setProfile(profileData as Profile);
        setConversations(inboxRes.ok && Array.isArray(inboxData) ? inboxData : []);
        setError(null);
      } catch {
        if (!cancelled) setError("Connection problem. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const list = conversations ?? [];
    const unread = list.reduce((sum, c) => sum + c.unread_count, 0);
    const waiting = list.filter((c) => c.unread_count > 0).length;
    return { total: list.length, unread, waiting };
  }, [conversations]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200/90 bg-red-50/80 p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-900">{error}</p>
      </div>
    );
  }

  if (!profile || conversations === null) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-10 text-center shadow-sm dark:border-slate-800/90 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-600">Loading your workspace…</p>
      </div>
    );
  }

  const completion = profileCompletion(profile);
  const photo = resolveAvatarUrl(profile.photo_url);
  const recent = conversations.slice(0, 5);
  const firstName = user?.name?.split(" ")[0] ?? profile.full_name.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-[90rem] space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-accent">Mentor workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-ink dark:text-white sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {profile.approval_status === "approved"
              ? "Your profile is live. Keep an eye on new messages and stay ready to help."
              : profile.approval_status === "pending"
                ? "Your profile is being reviewed. You can still prepare replies in your inbox."
                : "Finish your profile so visitors can find you and start conversations."}
          </p>
        </div>
        {profile.approval_status === "approved" ? (
          <Link
            href={`/mentors/${profile.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-4 py-2.5 text-sm font-semibold text-brand-accent transition hover:border-brand-accent/50 hover:bg-brand-accent/15 active:scale-[0.98]"
          >
            View public profile
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </header>

      <StatusStrip status={profile.approval_status} reason={profile.rejection_reason} completion={completion} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conversations" value={stats.total} icon={Users} />
        <StatCard label="Unread messages" value={stats.unread} icon={MessageSquare} accent={stats.unread > 0} />
        <StatCard label="Waiting for you" value={stats.waiting} icon={Clock} accent={stats.waiting > 0} />
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile ready</p>
              <p className="mt-3 text-lg font-extrabold text-brand-ink">{statusLabel(profile.approval_status)}</p>
              {profile.is_featured ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Featured on the site
                </p>
              ) : null}
            </div>
            <CompletionRing value={completion} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800/90 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-extrabold tracking-tight text-brand-ink dark:text-white">Recent messages</h2>
            <Link
              href="/dashboard/mentor/messages"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary transition hover:text-brand-accent"
            >
              Open inbox
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
              <MessageSquare className="mx-auto h-8 w-8 text-brand-accent/70" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">No messages yet</p>
              <p className="mt-1 text-sm text-slate-500">
                {profile.approval_status === "approved"
                  ? "When someone reaches out from your profile, it will show up here."
                  : "Once your profile is live, visitors can message you from the mentors page."}
              </p>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href="/dashboard/mentor/messages"
                    className="group flex items-start justify-between gap-3 py-4 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-ink transition group-hover:text-brand-primary dark:text-white">
                        {c.visitor_name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                        {c.last_message_preview ?? "New conversation"}
                      </p>
                      <time className="mt-1 block text-xs text-slate-400">
                        {new Date(c.last_message_at).toLocaleString()}
                      </time>
                    </div>
                    {c.unread_count > 0 ? (
                      <span className="shrink-0 rounded-full bg-brand-accent px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                        {c.unread_count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800/90 dark:bg-slate-900">
          <h2 className="text-lg font-extrabold tracking-tight text-brand-ink dark:text-white">Your profile</h2>
          <div className="mt-5 flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-2 ring-brand-accent/40">
              {photo ? (
                <Image src={photo} alt="" fill className="object-cover" sizes="80px" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-brand-primary">
                  {profile.full_name.slice(0, 1) || "?"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-brand-ink dark:text-white">{profile.full_name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{profile.headline || "Add a headline"}</p>
              {profile.city ? (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {profile.city}
                  {profile.origin_country ? ` · from ${profile.origin_country}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              href="/dashboard/mentor/profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-dark active:scale-[0.98]"
            >
              <UserRound className="h-4 w-4" aria-hidden />
              Edit profile
            </Link>
            <Link
              href="/dashboard/mentor/messages"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-accent/40 hover:text-brand-accent dark:border-slate-700 dark:text-slate-200"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              Messages
            </Link>
          </div>

          {profile.approval_status !== "approved" && completion < 100 ? (
            <div className="mt-6 rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-4">
              <p className="text-sm font-semibold text-brand-ink">Next step</p>
              <p className="mt-1 text-sm text-slate-600">
                Your profile is {completion}% complete. Fill in the remaining details, then submit for review.
              </p>
            </div>
          ) : null}

          {profile.approval_status === "approved" && profile.approved_at ? (
            <p className="mt-6 text-xs text-slate-500">
              Live since {new Date(profile.approved_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <span
          className={`rounded-lg p-2 ${accent ? "bg-brand-accent/15 text-brand-accent" : "bg-slate-100 text-brand-primary dark:bg-slate-800"}`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
      </div>
      <p className={`mt-3 text-3xl font-extrabold tabular-nums ${accent ? "text-brand-accent" : "text-brand-ink"}`}>{value}</p>
    </div>
  );
}

function StatusStrip({
  status,
  reason,
  completion,
}: {
  status: string;
  reason: string | null;
  completion: number;
}) {
  if (status === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/90 p-4 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="font-semibold">Your profile is live on Multivate</p>
          <p className="mt-1 text-emerald-800">People can find you on the mentors page and send you a message anytime.</p>
        </div>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4 text-sm text-amber-950">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" aria-hidden />
        <div>
          <p className="font-semibold">Your profile is under review</p>
          <p className="mt-1">We will let you know once it is approved. You can still check your inbox in the meantime.</p>
        </div>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200/90 bg-red-50/90 p-4 text-sm text-red-900">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
          !
        </div>
        <div>
          <p className="font-semibold">Your profile needs a few updates</p>
          <p className="mt-1">{reason ?? "Update your profile and submit again when you are ready."}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-4 text-sm">
      <div>
        <p className="font-semibold text-brand-ink">Complete your public profile</p>
        <p className="mt-1 text-slate-600">You are {completion}% done. Submit for review when everything looks good.</p>
      </div>
      <Link
        href="/dashboard/mentor/profile"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-accent-dark active:scale-[0.98]"
      >
        Continue setup
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
