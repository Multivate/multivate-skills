"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { readApiError } from "@/lib/api-error";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { PersonMark } from "@/components/dashboard/PersonMark";
import { StudentSurface } from "@/components/dashboard/StudentPageHero";
import { UserAvatar } from "@/components/ui/UserAvatar";

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

function greetingFor(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function statusCopy(status: string) {
  if (status === "approved") return "Your profile is live on the mentors page.";
  if (status === "pending") return "Your profile is in review.";
  if (status === "rejected") return "Your profile needs a few updates before it can go live.";
  return "Finish your profile, then submit it for review.";
}

function statusPill(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-800";
  if (status === "pending") return "bg-amber-50 text-amber-900";
  if (status === "rejected") return "bg-red-50 text-red-800";
  return "bg-[#eef3fb] text-[#011B33]/70";
}

function statusLabel(status: string) {
  if (status === "approved") return "Live";
  if (status === "pending") return "In review";
  if (status === "rejected") return "Needs updates";
  return "Draft";
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function expertiseChips(value: string) {
  return value
    .split(/[,·|;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
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
    const unread = list.reduce((sum, row) => sum + row.unread_count, 0);
    return { total: list.length, unread };
  }, [conversations]);

  const nextReply = useMemo(
    () => (conversations ?? []).find((row) => row.unread_count > 0) ?? (conversations ?? [])[0] ?? null,
    [conversations],
  );

  if (error) {
    return (
      <StudentSurface>
        <p className="text-sm text-red-700">{error}</p>
      </StudentSurface>
    );
  }

  if (!profile || conversations === null) {
    return (
      <StudentSurface>
        <div className="min-h-[70vh] animate-pulse space-y-8">
          <div className="h-16 w-80 rounded bg-brand-ink/10" />
          <div className="h-52 rounded-[5px] bg-brand-ink/10" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-24 rounded-[5px] bg-brand-ink/10" />
            <div className="h-24 rounded-[5px] bg-brand-ink/10" />
            <div className="h-24 rounded-[5px] bg-brand-ink/10" />
          </div>
        </div>
      </StudentSurface>
    );
  }

  const completion = profileCompletion(profile);
  const firstName = user?.name?.split(" ")[0] ?? profile.full_name.split(" ")[0] ?? "there";
  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const photo = resolveAvatarUrl(profile.photo_url);
  const place = [profile.city, profile.origin_country ? `from ${profile.origin_country}` : null].filter(Boolean).join(" · ");
  const chips = expertiseChips(profile.expertise_areas);

  return (
    <StudentSurface>
      <div className="space-y-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={profile.full_name} avatarUrl={photo} className="h-14 w-14 text-lg" />
            <div>
              <p className="text-sm text-[#011B33]/50">{weekday}</p>
              <h1 className="mt-0.5 text-[1.75rem] font-extrabold tracking-tight text-[#011B33] sm:text-[2rem]">
                {greetingFor(firstName)}
              </h1>
              <p className="mt-1 text-sm text-[#011B33]/60">{statusCopy(profile.approval_status)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-bold ${statusPill(profile.approval_status)}`}>
              {statusLabel(profile.approval_status)}
            </span>
            {profile.is_featured ? (
              <span className="inline-flex h-8 items-center rounded-full bg-brand-sky px-3 text-xs font-bold text-brand-accent">
                Featured
              </span>
            ) : null}
          </div>
        </header>

        {profile.approval_status === "rejected" && profile.rejection_reason ? (
          <p className="rounded-[5px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{profile.rejection_reason}</p>
        ) : null}

        <section className="overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white">
          {nextReply ? (
            <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">
                  {nextReply.unread_count > 0 ? "Reply next" : "Latest message"}
                </p>
                <div className="mt-4 flex items-start gap-4">
                  <PersonMark name={nextReply.visitor_name} className="h-12 w-12 text-sm" />
                  <div className="min-w-0">
                    <h2 className="text-xl font-extrabold">{nextReply.visitor_name}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#011B33]/65">
                      {nextReply.last_message_preview || "New conversation"}
                    </p>
                    <p className="mt-3 text-xs text-[#011B33]/40">{relativeTime(nextReply.last_message_at)}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/mentor/messages"
                  className="mt-7 inline-flex h-11 w-fit items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white hover:bg-[#0f4bb8]"
                >
                  Open inbox
                </Link>
              </div>
              <aside className="border-t border-brand-ink/10 bg-brand-sky/70 p-6 dark:bg-white/[0.04] md:border-l md:border-t-0 sm:p-8">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">This workspace</p>
                <p className="mt-3 text-sm leading-relaxed text-[#011B33]/70">
                  {stats.unread > 0
                    ? `${stats.unread} unread ${stats.unread === 1 ? "message" : "messages"} waiting for you.`
                    : "You’re caught up. Keep your profile current so the next person can find you."}
                </p>
                <ul className="mt-6 space-y-2 text-sm font-semibold">
                  <li>
                    <Link href="/dashboard/mentor/messages" className="text-brand-accent hover:underline">
                      Messages
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/mentor/profile" className="text-[#011B33]/75 hover:text-brand-accent">
                      Edit profile
                    </Link>
                  </li>
                  {profile.approval_status === "approved" ? (
                    <li>
                      <Link href={`/mentors/${profile.slug}`} className="text-[#011B33]/75 hover:text-brand-accent">
                        View public page
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </aside>
            </div>
          ) : (
            <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-accent">Inbox</p>
                <h2 className="mt-2 text-xl font-extrabold">No messages yet</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#011B33]/60">
                  {profile.approval_status === "approved"
                    ? "When someone writes from your public profile, it shows up here."
                    : "Messages appear here after your profile is live."}
                </p>
                <Link
                  href="/dashboard/mentor/profile"
                  className="mt-7 inline-flex h-11 w-fit items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white hover:bg-[#0f4bb8]"
                >
                  {profile.approval_status === "approved" ? "Edit profile" : "Finish profile"}
                </Link>
              </div>
              <aside className="border-t border-brand-ink/10 bg-brand-sky/70 p-6 dark:bg-white/[0.04] md:border-l md:border-t-0 sm:p-8">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#011B33]/45">Next step</p>
                <p className="mt-3 text-sm leading-relaxed text-[#011B33]/70">
                  {completion < 100
                    ? `Your profile is ${completion}% complete. A full page helps people trust you.`
                    : "Your profile is complete. Submit it if it is not live yet."}
                </p>
              </aside>
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Conversations", value: String(stats.total) },
            { label: "Unread", value: String(stats.unread) },
            { label: "Profile", value: `${completion}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-[5px] border border-brand-ink/10 bg-white px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#011B33]/45">{item.label}</p>
              <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight">{item.value}</p>
              {item.label === "Profile" ? (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-brand-ink/10">
                  <div className="h-full bg-brand-accent" style={{ width: `${completion}%` }} />
                </div>
              ) : null}
            </div>
          ))}
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-lg font-extrabold">Inbox</h2>
              <Link href="/dashboard/mentor/messages" className="text-sm font-semibold text-brand-accent hover:underline">
                See all
              </Link>
            </div>
            {conversations.length === 0 ? (
              <div className="rounded-[5px] border border-dashed border-brand-ink/20 px-5 py-10 text-center">
                <p className="text-sm font-semibold">Quiet for now</p>
                <p className="mt-1 text-sm text-[#011B33]/55">New conversations will land here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-ink/10 overflow-hidden rounded-[5px] border border-brand-ink/10 bg-white">
                {conversations.slice(0, 6).map((row) => (
                  <li key={row.id}>
                    <Link
                      href="/dashboard/mentor/messages"
                      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#f6f8fb]"
                    >
                      <PersonMark name={row.visitor_name} className="h-10 w-10 shrink-0 text-[11px]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-bold">{row.visitor_name}</span>
                          <span className="shrink-0 text-[11px] text-[#011B33]/40">{relativeTime(row.last_message_at)}</span>
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-xs text-[#011B33]/55">
                          {row.last_message_preview || "New conversation"}
                        </span>
                      </span>
                      {row.unread_count > 0 ? (
                        <span className="shrink-0 rounded-full bg-brand-accent px-2 py-0.5 text-[11px] font-bold text-white">
                          {row.unread_count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-lg font-extrabold">Public profile</h2>
            <div className="rounded-[5px] border border-brand-ink/10 bg-white p-6">
              <div className="flex gap-4">
                <UserAvatar name={profile.full_name} avatarUrl={photo} className="h-16 w-16 text-lg" />
                <div className="min-w-0">
                  <p className="text-lg font-extrabold leading-snug">{profile.full_name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#011B33]/60">{profile.headline || "Add a headline"}</p>
                  {place ? <p className="mt-1 text-xs text-[#011B33]/45">{place}</p> : null}
                </div>
              </div>
              {chips.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <span key={chip} className="rounded-full bg-[#f4f7fd] px-3 py-1 text-xs font-semibold text-[#011B33]/70">
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-[#011B33]/55">Add the topics you can advise on.</p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/mentor/profile"
                  className="inline-flex h-10 items-center rounded-[5px] bg-brand-accent px-4 text-sm font-semibold text-white hover:bg-[#0f4bb8]"
                >
                  Edit profile
                </Link>
                {profile.approval_status === "approved" ? (
                  <Link
                    href={`/mentors/${profile.slug}`}
                    className="inline-flex h-10 items-center rounded-[5px] border border-brand-ink/15 px-4 text-sm font-semibold hover:border-brand-accent hover:text-brand-accent"
                  >
                    View live page
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentSurface>
  );
}
