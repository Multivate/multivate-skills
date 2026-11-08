"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "@/components/layout/LogoMark";

const CONTACT_EMAIL = "info@multivate.com.ng";

export function StudentSiteFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tStudent = useTranslations("dashboard.nav.student");
  const year = new Date().getFullYear();

  const columns = [
    {
      title: tNav("explore"),
      links: [
        { href: "/courses", label: tNav("courses") },
        { href: "/courses?search=German", label: tNav("german") },
        { href: "/mentors", label: tNav("mentors") },
        { href: "/dashboard/courses?tab=tools", label: tStudent("learningTools") },
      ],
    },
    {
      title: tStudent("myCourses"),
      links: [
        { href: "/dashboard/courses", label: tStudent("myCourses") },
        { href: "/dashboard/courses?tab=wishlist", label: tStudent("wishlist") },
        { href: "/dashboard/subscribe", label: tStudent("subscribe") },
        { href: "/dashboard/book-1on1", label: tStudent("bookOneOnOne") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "/#about", label: t("coAbout") },
        { href: "/#mission", label: t("coMission") },
        { href: `mailto:${CONTACT_EMAIL}`, label: t("coContact"), external: true },
      ],
    },
    {
      title: t("support"),
      links: [
        { href: "/dashboard/settings", label: tStudent("settings") },
        { href: "/privacy", label: t("suPrivacy") },
        { href: "/terms", label: t("suTerms") },
        { href: `mailto:${CONTACT_EMAIL}`, label: t("suSupport"), external: true },
      ],
    },
  ];

  return (
    <footer className="mt-auto bg-[#10244F] text-white">
      <div className="mx-auto max-w-[84rem] px-4 pt-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <LogoMark variant="inverse" className="max-h-9 max-w-[11rem]" />
            <p className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("missionLine")}</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">{t("tagline")}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-sm font-medium text-[#b7dcff] hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-base font-bold">{column.title}</h2>
                <ul className="mt-4 space-y-3">
                  {column.links.map((item) => (
                    <li key={item.href + item.label}>
                      {"external" in item && item.external ? (
                        <a href={item.href} className="text-sm text-white/75 hover:text-white">
                          {item.label}
                        </a>
                      ) : (
                        <Link href={item.href} className="text-sm text-white/75 hover:text-white">
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{tCommon("copyright", { year })}</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">
              {t("suPrivacy")}
            </Link>
            <Link href="/terms" className="hover:text-white">
              {t("suTerms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
