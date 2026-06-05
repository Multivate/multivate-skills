"use client";

import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";

type MyCourse = {
  slug: string;
  title: string;
  progress_pct: number;
};

type CertificateRow = {
  id: string;
  course_slug: string;
  course_title: string;
  code: string;
  issued_at: string;
};

export default function DashboardCertificatesPage() {
  const [courses, setCourses] = useState<MyCourse[] | null>(null);
  const [certs, setCerts] = useState<CertificateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [cRes, kRes] = await Promise.all([
      fetch("/api/learning/my-courses", { credentials: "include", cache: "no-store" }),
      fetch("/api/learning/certificates/me", { credentials: "include", cache: "no-store" }),
    ]);
    const cData = await cRes.json().catch(() => null);
    const kData = await kRes.json().catch(() => null);
    if (!cRes.ok) {
      setError(typeof cData?.detail === "string" ? cData.detail : "We couldn't load your courses.");
      setCourses([]);
      setCerts([]);
      return;
    }
    if (!kRes.ok) {
      setError(typeof kData?.detail === "string" ? kData.detail : "We couldn't load your certificates.");
      setCourses(Array.isArray(cData) ? cData : []);
      setCerts([]);
      return;
    }
    setCourses(Array.isArray(cData) ? cData : []);
    setCerts(Array.isArray(kData) ? kData : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const issuedSlugs = new Set((certs ?? []).map((c) => c.course_slug));
  const eligible =
    (courses ?? []).filter((c) => c.progress_pct >= 100 && !issuedSlugs.has(c.slug)) ?? [];

  const claim = async (slug: string) => {
    setClaimMsg(null);
    setClaiming(slug);
    try {
      const res = await fetch(`/api/learning/certificates/${encodeURIComponent(slug)}/issue`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setClaimMsg(typeof data?.detail === "string" ? data.detail : "We couldn't issue the certificate.");
        return;
      }
      setClaimMsg("Certificate issued. You can share your credential code with employers or schools.");
      await load();
    } catch {
      setClaimMsg("Connection problem. Please try again.");
    } finally {
      setClaiming(null);
    }
  };

  if (courses === null || certs === null) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">Loading certificates…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight text-brand-ink sm:text-2xl">Certificates</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          When you complete a course (100% progress), you can generate a verifiable credential code here. PDF export
          can be added later; today your code is the official record in Multivate.
        </p>
      </header>

      {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}
      {claimMsg ? <p className="text-sm font-medium text-emerald-900">{claimMsg}</p> : null}

      {eligible.length > 0 ? (
        <section className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-6 shadow-sm sm:p-8">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-emerald-900/90">Ready to claim</h2>
          <p className="mt-2 text-sm text-emerald-950/80">You have finished these courses and can issue a certificate.</p>
          <ul className="mt-4 space-y-3">
            {eligible.map((c) => (
              <li
                key={c.slug}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-brand-ink">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.slug}</p>
                </div>
                <button
                  type="button"
                  disabled={claiming === c.slug}
                  onClick={() => void claim(c.slug)}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {claiming === c.slug ? "Issuing…" : "Issue certificate"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Your credentials</h2>
        {certs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
            <p className="text-sm text-slate-600">
              No certificates yet. Complete a course to 100%, then return here to claim your credential.
            </p>
            <Link href="/courses" className="btn-primary-brand mt-6 inline-flex !no-underline">
              Browse courses
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 shadow-sm">
            {certs.map((c) => (
              <li key={c.id} className="px-5 py-4">
                <p className="font-semibold text-brand-ink">{c.course_title}</p>
                <p className="mt-1 font-mono text-sm text-slate-800">{c.code}</p>
                <p className="mt-1 text-xs text-slate-500">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
