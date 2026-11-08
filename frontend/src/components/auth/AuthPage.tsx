"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/layout/LogoMark";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Link } from "@/i18n/navigation";

export function AuthPage({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");

  return (
    <div className="min-h-screen bg-brand-sky">
      <SiteHeader />
      <main className="container-page py-10 sm:py-14">
        <div className="mx-auto w-full max-w-[28rem] rounded-[5px] border border-brand-ink/10 bg-white px-5 py-7 shadow-[0_10px_28px_rgba(12,27,74,0.06)] sm:px-8 sm:py-8">
          <Link href="/" aria-label={t("homeAria")} className="mb-6 flex justify-center">
            <LogoMark priority className="!h-12 !max-h-none sm:!h-14" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
