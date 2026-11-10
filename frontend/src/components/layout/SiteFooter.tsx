import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FooterSocialMarks } from "./FooterSocialMarks";
import { LogoMark } from "./LogoMark";

const CONTACT_EMAIL = "info@multivate.com.ng";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  const tTeach = await getTranslations("landing.teach");
  const tLearn = await getTranslations("auth.learning");
  const tCommon = await getTranslations("common");
  const year = new Date().getFullYear();

  const columns = [
    {
      title: tNav("explore"),
      links: [
        { href: "/courses", label: tNav("courses") },
        { href: "/courses?search=German", label: tNav("german") },
        { href: "/courses?search=tech", label: tLearn("learnTechnology") },
        { href: "/mentors", label: tNav("mentors") },
      ],
    },
    {
      title: tNav("teach"),
      links: [
        { href: "/#teach", label: tTeach("title") },
        { href: "/register?intent=instructor", label: tTeach("ctaInstructor") },
        { href: "/login?from=/instructor/studio", label: tTeach("ctaStudio") },
      ],
    },
    {
      title: t("company"),
      links: [
        { href: "/about", label: t("coAbout") },
        { href: "/about#mission", label: t("coMission") },
        { href: "/contact", label: t("coContact") },
      ],
    },
    {
      title: t("support"),
      links: [
        { href: "/login", label: tCommon("signIn") },
        { href: "/register", label: tCommon("getStarted") },
        { href: "/privacy", label: t("suPrivacy") },
        { href: "/terms", label: t("suTerms") },
        { href: `mailto:${CONTACT_EMAIL}`, label: t("suSupport"), external: true },
      ],
    },
  ];

  return (
    <footer className="bg-brand-navy text-white">
      <div className="container-page pt-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <LogoMark variant="inverse" className="max-h-9 max-w-[11rem]" />
            <p className="mt-6 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t("missionLine")}
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">{t("tagline")}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-sm font-medium text-[#b7dcff] hover:text-white">
              {CONTACT_EMAIL}
            </a>
            <FooterSocialMarks heading={t("follow")} />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-base font-bold text-white">{column.title}</h2>
                <ul className="mt-4 space-y-3">
                  {column.links.map((item) => (
                    <li key={item.href + item.label}>
                      {"external" in item && item.external ? (
                        <a href={item.href} className="text-sm text-white/75 transition-colors hover:text-white">
                          {item.label}
                        </a>
                      ) : (
                        <Link href={item.href} className="text-sm text-white/75 transition-colors hover:text-white">
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

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
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
