"use client";

import { StudentSurface } from "@/components/dashboard/StudentPageHero";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";

export default function PublicProfileEditorPage() {
  const { user, refreshUser } = useAuth();
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setHeadline(user.public_headline ?? "");
    setBio(user.public_bio ?? "");
    setIsPublic(Boolean(user.profile_public));
    setSlug(user.public_slug ?? null);
  }, [user]);

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_headline: headline,
          public_bio: bio,
          profile_public: isPublic,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(typeof data?.detail === "string" ? data.detail : "We couldn't save your profile.");
        return;
      }
      setSlug(typeof data?.public_slug === "string" ? data.public_slug : slug);
      setIsPublic(Boolean(data?.profile_public));
      setMsg("Saved.");
      void refreshUser();
    } catch {
      setErr("Connection problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StudentSurface>
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-sm text-[#011B33]/50">Account</p>
          <h1 className="mt-1 text-[1.75rem] font-extrabold tracking-tight">Public profile</h1>
          <p className="mt-2 text-sm text-[#011B33]/60">
            Optional. Off by default. When on, other people can see this page — not your email or payments.
          </p>
        </header>

        <label className="flex items-start gap-3 rounded-[5px] border border-brand-ink/10 px-4 py-4">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold">Make my profile public</span>
            <span className="mt-1 block text-xs text-[#011B33]/55">Creates a shareable page on Multivate.</span>
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Headline</span>
          <input
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            maxLength={255}
            placeholder="e.g. Learning German for work in Berlin"
            className="mt-1.5 h-11 w-full rounded-[5px] border border-brand-ink/15 px-3 text-sm outline-none focus:border-brand-accent"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">About you</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={4000}
            rows={6}
            placeholder="What you are learning, and why."
            className="mt-1.5 w-full rounded-[5px] border border-brand-ink/15 px-3 py-2.5 text-sm outline-none focus:border-brand-accent"
          />
        </label>

        {err ? <p className="text-sm text-red-700">{err}</p> : null}
        {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="inline-flex h-11 items-center rounded-[5px] bg-brand-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
          {isPublic && slug ? (
            <Link href={`/u/${slug}`} className="text-sm font-semibold text-brand-accent hover:underline">
              View public page
            </Link>
          ) : null}
        </div>
      </div>
    </StudentSurface>
  );
}
