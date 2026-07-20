"use client";

import { CheckCircle2, Clock, Loader2, Send, Upload as UploadIcon, XCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { Upload } from "@/components/ui/Upload";

type Profile = {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  photo_url: string | null;
  city: string;
  origin_country: string | null;
  years_in_germany: number | null;
  german_level: string | null;
  field_of_work: string | null;
  expertise_areas: string;
  languages_spoken: string;
  career_tips: string | null;
  approval_status: string;
  rejection_reason: string | null;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/25 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const labelClass = "block text-sm font-semibold text-slate-800 dark:text-slate-200";

export function MentorProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/mentor/profile", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(readApiError(data, "Could not load your profile."));
      return;
    }
    setProfile(data as Profile);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/mentor/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profile.full_name,
          headline: profile.headline,
          bio: profile.bio,
          city: profile.city,
          origin_country: profile.origin_country,
          years_in_germany: profile.years_in_germany,
          german_level: profile.german_level,
          field_of_work: profile.field_of_work,
          expertise_areas: profile.expertise_areas,
          languages_spoken: profile.languages_spoken,
          career_tips: profile.career_tips,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "Could not save your profile."));
        return;
      }
      setProfile(data as Profile);
      setMsg("Saved.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForReview() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/mentor/profile/submit", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "Complete all required fields before submitting."));
        return;
      }
      setProfile(data as Profile);
      setMsg("Submitted for review. We will notify you once it is live.");
    } finally {
      setBusy(false);
    }
  }



  if (!profile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  const photo = resolveAvatarUrl(profile.photo_url);
  const status = profile.approval_status;

  return (
    <div className="space-y-6">
      <StatusBanner status={status} reason={profile.rejection_reason} />

      {err ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}
      {msg ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p> : null}

      <form onSubmit={save} className="space-y-8">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-brand-ink dark:text-white">Photo</h2>
          <p className="mt-1 text-sm text-slate-600">A clear, professional headshot helps visitors trust your guidance.</p>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-slate-100 ring-2 ring-brand-accent/30">
              {photo ? (
                <Image src={photo} alt="" fill className="object-cover" sizes="96px" />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-brand-primary">
                  {profile.full_name.slice(0, 1) || "?"}
                </div>
              )}
            </div>
            <Upload
              folder="mentors"
              uploadUrl="/api/mentor/profile/photo"
              accept="image/jpeg,image/png,image/webp"
              compact
              label="Upload photo"
              onSuccess={(profileResult) => {
                setMsg("Photo updated.");
                setProfile(profileResult);
              }}
              onError={(msg) => setErr(msg)}
            />
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
          <h2 className="sm:col-span-2 text-lg font-bold text-brand-ink dark:text-white">About you</h2>
          <label className={labelClass}>
            Full name
            <input required className={inputClass} value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </label>
          <label className={labelClass}>
            Professional headline
            <input required className={inputClass} placeholder="e.g. Registered nurse · Munich" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Your story
            <textarea
              required
              rows={6}
              className={inputClass}
              placeholder="A few sentences about your path to Germany."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
            <span className="mt-1 block text-xs text-slate-500">At least 80 characters.</span>
          </label>
        </section>

        <section className="grid gap-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2">
          <h2 className="sm:col-span-2 text-lg font-bold text-brand-ink dark:text-white">Location & background</h2>
          <label className={labelClass}>
            City in Germany
            <input required className={inputClass} value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </label>
          <label className={labelClass}>
            Country of origin
            <input className={inputClass} value={profile.origin_country ?? ""} onChange={(e) => setProfile({ ...profile, origin_country: e.target.value })} />
          </label>
          <label className={labelClass}>
            Years living in Germany
            <input type="number" min={0} required className={inputClass} value={profile.years_in_germany ?? ""} onChange={(e) => setProfile({ ...profile, years_in_germany: e.target.value ? Number(e.target.value) : null })} />
          </label>
          <label className={labelClass}>
            German level
            <input className={inputClass} placeholder="e.g. B2, C1" value={profile.german_level ?? ""} onChange={(e) => setProfile({ ...profile, german_level: e.target.value })} />
          </label>
          <label className={labelClass}>
            Field of work
            <input className={inputClass} placeholder="e.g. Information technology" value={profile.field_of_work ?? ""} onChange={(e) => setProfile({ ...profile, field_of_work: e.target.value })} />
          </label>
          <label className={labelClass}>
            Languages you speak
            <input required className={inputClass} placeholder="English, German (B2), Yoruba" value={profile.languages_spoken} onChange={(e) => setProfile({ ...profile, languages_spoken: e.target.value })} />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-brand-ink dark:text-white">How you help</h2>
          <label className={`${labelClass} mt-4`}>
            Areas you can advise on
            <textarea required rows={3} className={inputClass} placeholder="Visa pathways, Ausbildung, IT careers, settling in, language learning…" value={profile.expertise_areas} onChange={(e) => setProfile({ ...profile, expertise_areas: e.target.value })} />
          </label>
          <label className={`${labelClass} mt-4`}>
            Career advice for newcomers
            <textarea rows={4} className={inputClass} placeholder="Practical tips you would give someone planning their move." value={profile.career_tips ?? ""} onChange={(e) => setProfile({ ...profile, career_tips: e.target.value })} />
          </label>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="btn-primary-brand rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-60">
            Save draft
          </button>
          {status !== "pending" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitForReview()}
              className="btn-cta-accent inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Submit for review
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function StatusBanner({ status, reason }: { status: string; reason: string | null }) {
  if (status === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Your profile is live</p>
          <p className="mt-1 text-emerald-800">Visitors can find you on the mentors page and message you. Edits will go back for review.</p>
        </div>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" />
        <div>
          <p className="font-semibold">Under review</p>
          <p className="mt-1">Our team is checking your profile. You will be able to edit again after a decision.</p>
        </div>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Updates needed</p>
          {reason ? <p className="mt-1">{reason}</p> : <p className="mt-1">Please update your profile and submit again.</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      Complete your profile, then submit for review. Only approved profiles appear on the public site.
    </div>
  );
}
