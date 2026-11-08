"use client";

import { StudentPageHero, StudentSurface } from "@/components/dashboard/StudentPageHero";
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
  const eligible = (courses ?? []).filter((c) => c.progress_pct >= 100 && !issuedSlugs.has(c.slug));

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

  return (
    <>
      <StudentPageHero title="Certificates" subtitle="Claim a credential only after you finish a course. The code is yours to share." />
      <StudentSurface>
        {courses === null || certs === null ? <p className="text-sm text-[#6a6f73]">Loading certificates…</p> : null}
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {claimMsg ? <p className="text-sm font-medium text-[#1F8A4C]">{claimMsg}</p> : null}

        {eligible.length > 0 ? (
          <section className="rounded border border-[#d1d7dc] p-5 sm:p-6">
            <h2 className="text-base font-bold">Ready to claim</h2>
            <p className="mt-1 text-sm text-[#6a6f73]">You have finished these courses and can issue a certificate.</p>
            <ul className="mt-4 space-y-3">
              {eligible.map((c) => (
                <li key={c.slug} className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#d1d7dc] px-4 py-3">
                  <div>
                    <p className="font-bold">{c.title}</p>
                  </div>
                  <button
                    type="button"
                    disabled={claiming === c.slug}
                    onClick={() => void claim(c.slug)}
                    className="bg-[#1457D0] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {claiming === c.slug ? "Issuing…" : "Issue certificate"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {certs ? (
          <section className="mt-5 rounded border border-[#d1d7dc] p-5 sm:p-6">
            <h2 className="text-base font-bold">Your credentials</h2>
            {certs.length === 0 ? (
              <div className="mt-6 py-8 text-center">
                <p className="text-sm text-[#6a6f73]">No certificates yet. Finish a course to claim one.</p>
                <Link href="/courses" className="mt-4 inline-flex text-sm font-bold text-[#1457D0]">
                  Browse courses
                </Link>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[#d1d7dc]">
                {certs.map((c) => (
                  <li key={c.id} className="py-4 first:pt-0 last:pb-0">
                    <p className="font-bold">{c.course_title}</p>
                    <p className="mt-1 font-mono text-sm">{c.code}</p>
                    <p className="mt-1 text-xs text-[#6a6f73]">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </StudentSurface>
    </>
  );
}
