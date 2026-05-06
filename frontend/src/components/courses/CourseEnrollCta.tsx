"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

type Props = {
  courseSlug: string;
};

export function CourseEnrollCta({ courseSlug }: Props) {
  const t = useTranslations("courseEnroll");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const enroll = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_slug: courseSlug }),
      });
      if (res.status === 401) {
        router.push(`/login?from=${encodeURIComponent(`/courses/${courseSlug}`)}`);
        return;
      }
      if (res.status === 204) {
        setMsg(t("enrolledMsg"));
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as { detail?: unknown } | null;
      const detail =
        data && typeof data === "object" && data.detail !== undefined
          ? typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail)
          : `Could not enroll (${res.status})`;
      setMsg(detail);
    } catch {
      setMsg(t("networkError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={() => void enroll()}
        disabled={busy}
        className="btn-primary-brand block w-full text-center !py-3 disabled:opacity-60"
      >
        {busy ? t("enrolling") : t("enrollCta")}
      </button>
      <p className="text-center text-xs text-slate-500">{t("sessionNote")}</p>
      {msg ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-800">{msg}</p>
      ) : null}
      <Link href="/register" className="block text-center text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
        {t("needAccount")}
      </Link>
    </div>
  );
}
