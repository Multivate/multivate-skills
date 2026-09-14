"use client";

import { Link } from "@/i18n/navigation";
import { ArrowUpRight, CheckCircle2, Clock, ExternalLink, MessageSquare, UserRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { readApiError } from "@/lib/api-error";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import {
  DashboardMetricStrip,
  DashboardPageHeader,
  DashboardPanel,
  DashboardQuietLink,
  DashboardState,
} from "@/components/dashboard/dashboard-ui";

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
      <DashboardState tone="error">
        <p className="font-semibold">{error}</p>
      </DashboardState>
    );
  }

  if (!profile || conversations === null) {
    return <DashboardState>Loading your workspace…</DashboardState>;
  }

  const completion = profileCompletion(profile);
  const photo = resolveAvatarUrl(profile.photo_url);
  const recent = conversations.slice(0, 5);
  const firstName = user?.name?.split(" ")[0] ?? profile.full_name.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-[90rem] space-y-10">
      <DashboardPageHeader
        eyebrow="Mentor"
        title={`Welcome back, ${firstName}`}
        description={
          profile.approval_status === "approved"
            ? "Your profile is live."
            : profile.approval_status === "pending"
              ? "Your profile is in review."
              : "Finish your profile to go live."
        }
        action={
          profile.approval_status === "approved" ? (
            <Link
              href={`/mentors/${profile.slug}`}
              className="inline-flex items-center gap-2 border border-brand-ink/15 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-ink hover:bg-brand-ink hover:text-white"
            >
              Public profile
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          ) : null
        }
      />

      <StatusStrip status={profile.approval_status} reason={profile.rejection_reason} completion={completion} />

      <DashboardMetricStrip
        items={[
          { label: "Conversations", value: stats.total },
          {
            label: "Unread",
            value: stats.unread,
            hint: stats.unread > 0 ? <span className="text-brand-accent">Needs attention</span> : undefined,
          },
          { label: "Waiting", value: stats.waiting },
          {
            label: "Profile",
            value: statusLabel(profile.approval_status),
            hint: <span>{completion}% complete{profile.is_featured ? " · Featured" : ""}</span>,
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel
          title="Recent messages"
          action={<DashboardQuietLink href="/dashboard/mentor/messages">Open inbox</DashboardQuietLink>}
        >
          {recent.length === 0 ? (
            <div className="border border-dashed border-brand-ink/15 px-6 py-10 text-center">
              <MessageSquare className="mx-auto h-7 w-7 text-brand-accent" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-brand-ink">No messages yet</p>
              <p className="mt-1 text-sm text-brand-ink/55">
                {profile.approval_status === "approved"
                  ? "When someone reaches out from your profile, it will show up here."
                  : "Once your profile is live, visitors can message you from the mentors page."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-brand-ink/10">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link
                    href="/dashboard/mentor/messages"
                    className="group flex items-start justify-between gap-3 py-4 transition hover:bg-brand-muted/50 -mx-2 px-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-ink group-hover:text-brand-accent">{c.visitor_name}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-brand-ink/60">
                        {c.last_message_preview ?? "New conversation"}
                      </p>
                      <time className="mt-1 block text-xs text-brand-ink/40">
                        {new Date(c.last_message_at).toLocaleString()}
                      </time>
                    </div>
                    {c.unread_count > 0 ? (
                      <span className="shrink-0 bg-brand-accent px-2 py-0.5 text-xs font-bold text-white">
                        {c.unread_count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel title="Your profile">
          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-brand-muted">
              {photo ? (
                <Image src={photo} alt="" fill className="object-cover" sizes="80px" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-2xl font-bold text-brand-ink">
                  {profile.full_name.slice(0, 1) || "?"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-brand-ink">{profile.full_name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-brand-ink/60">{profile.headline || "Add a headline"}</p>
              {profile.city ? (
                <p className="mt-2 text-xs text-brand-ink/45">
                  {profile.city}
                  {profile.origin_country ? ` · from ${profile.origin_country}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              href="/dashboard/mentor/profile"
              className="inline-flex items-center justify-center gap-2 bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary"
            >
              <UserRound className="h-4 w-4" aria-hidden />
              Edit profile
            </Link>
            <Link
              href="/dashboard/mentor/messages"
              className="inline-flex items-center justify-center gap-2 border border-brand-ink/15 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-ink"
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              Messages
            </Link>
          </div>

          {profile.approval_status !== "approved" && completion < 100 ? (
            <div className="mt-6 border border-brand-accent/25 bg-brand-accent/5 p-4">
              <p className="text-sm font-semibold text-brand-ink">Next step</p>
              <p className="mt-1 text-sm text-brand-ink/65">
                Your profile is {completion}% complete. Fill in the remaining details, then submit for review.
              </p>
            </div>
          ) : null}

          {profile.approval_status === "approved" && profile.approved_at ? (
            <p className="mt-6 text-xs text-brand-ink/45">
              Live since {new Date(profile.approved_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          ) : null}
        </DashboardPanel>
      </div>
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
      <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
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
      <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
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
      <div className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-red-100 text-xs font-bold text-red-700">
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
    <div className="flex flex-wrap items-center justify-between gap-4 border border-brand-accent/25 bg-brand-accent/5 p-4 text-sm">
      <div>
        <p className="font-semibold text-brand-ink">Complete your public profile</p>
        <p className="mt-1 text-brand-ink/65">You are {completion}% done. Submit for review when everything looks good.</p>
      </div>
      <Link
        href="/dashboard/mentor/profile"
        className="inline-flex shrink-0 items-center gap-2 bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent-dark"
      >
        Continue setup
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
