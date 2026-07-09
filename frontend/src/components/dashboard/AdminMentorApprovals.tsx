"use client";

import { Check, Loader2, Star, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";
import { resolveAvatarUrl } from "@/lib/avatar-url";

type MentorRow = {
  id: string;
  slug: string;
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
  approval_status: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  linked_user_email: string | null;
  is_featured: boolean;
  sort_order: number;
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-800",
};

export function AdminMentorApprovals() {
  const [rows, setRows] = useState<MentorRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/mentors", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(readApiError(data, "Could not load mentor profiles."));
      setRows([]);
      return;
    }
    setRows(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/mentors/${id}/approve`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "Could not approve this profile."));
        return;
      }
      setMsg("Profile approved. It can now appear on the site.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function submitReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectId || !rejectReason.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/mentors/${rejectId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "Could not update this profile."));
        return;
      }
      setRejectId(null);
      setRejectReason("");
      setMsg("Profile returned to the mentor with your feedback.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured(row: MentorRow) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/mentors/${row.id}/feature`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !row.is_featured }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "Could not update featured status."));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const pending = rows?.filter((r) => r.approval_status === "pending") ?? [];
  const others = rows?.filter((r) => r.approval_status !== "pending") ?? [];

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Mentors build their own profiles. Review submissions before they go live on the homepage and mentors page.
      </p>

      {err ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p> : null}
      {msg ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p> : null}

      {rejectId ? (
        <form onSubmit={submitReject} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-bold text-brand-ink dark:text-white">Reason for return</h3>
          <p className="mt-1 text-sm text-slate-600">The mentor will see this and can update their profile.</p>
          <textarea
            required
            rows={3}
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary-brand rounded-xl px-4 py-2 text-sm font-semibold">
              Send feedback
            </button>
            <button type="button" onClick={() => setRejectId(null)} className="rounded-xl border px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {rows === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-bold text-brand-ink dark:text-white">
              Awaiting review ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No profiles waiting for approval.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {pending.map((row) => (
                  <MentorReviewCard
                    key={row.id}
                    row={row}
                    busy={busy}
                    onApprove={() => approve(row.id)}
                    onReject={() => setRejectId(row.id)}
                    onToggleFeatured={() => toggleFeatured(row)}
                  />
                ))}
              </div>
            )}
          </section>

          {others.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-brand-ink dark:text-white">All profiles</h2>
              <div className="mt-4 space-y-4">
                {others.map((row) => (
                  <MentorReviewCard
                    key={row.id}
                    row={row}
                    busy={busy}
                    onApprove={() => approve(row.id)}
                    onReject={() => setRejectId(row.id)}
                    onToggleFeatured={() => toggleFeatured(row)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function MentorReviewCard({
  row,
  busy,
  onApprove,
  onReject,
  onToggleFeatured,
}: {
  row: MentorRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onToggleFeatured: () => void;
}) {
  const photo = resolveAvatarUrl(row.photo_url);
  const statusClass = statusStyles[row.approval_status] ?? statusStyles.draft;

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-2 ring-brand-accent/20">
            {photo ? (
              <Image src={photo} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full items-center justify-center font-bold text-brand-primary">{row.full_name.slice(0, 1)}</div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-brand-ink dark:text-white">{row.full_name}</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusClass}`}>
                {row.approval_status}
              </span>
              {row.is_featured ? (
                <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-[11px] font-semibold text-brand-accent">Featured</span>
              ) : null}
            </div>
            <p className="text-sm text-slate-600">{row.headline}</p>
            <p className="mt-1 text-xs text-slate-500">
              {row.linked_user_email}
              {row.city ? ` · ${row.city}` : ""}
              {row.years_in_germany != null ? ` · ${row.years_in_germany} yrs in Germany` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {row.approval_status === "pending" ? (
            <>
              <button type="button" disabled={busy} onClick={onApprove} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button type="button" disabled={busy} onClick={onReject} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                <X className="h-3.5 w-3.5" />
                Return
              </button>
            </>
          ) : null}
          {row.approval_status === "approved" ? (
            <button type="button" disabled={busy} onClick={onToggleFeatured} className="inline-flex items-center gap-1 rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-3 py-1.5 text-xs font-semibold text-brand-accent">
              <Star className="h-3.5 w-3.5" />
              {row.is_featured ? "Unfeature" : "Feature on homepage"}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-4 line-clamp-4 text-sm text-slate-600 dark:text-slate-400">{row.bio}</p>
      {row.rejection_reason ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">Last feedback: {row.rejection_reason}</p>
      ) : null}
    </article>
  );
}
