"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/layout/LogoMark";
import { Link } from "@/i18n/navigation";

export function AuthPage({ children }: { children: ReactNode }) {
  const tNav = useTranslations("nav");

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-[#F3F6FA] pt-[env(safe-area-inset-top)]">
      <main className="mx-auto flex min-h-0 w-full max-w-[28rem] flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:py-12">
        <div className="rounded-[16px] border border-brand-ink/10 bg-white px-5 py-7 shadow-[0_10px_28px_rgba(12,27,74,0.06)] sm:px-8 sm:py-8">
          <Link href="/" aria-label={tNav("homeAria")} className="mb-6 flex justify-center">
            <LogoMark priority className="!h-12 !max-h-none sm:!h-14" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
