import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogoMark } from "./LogoMark";

const CONTACT_EMAIL = "info@multivate.com.ng";

const SOCIALS = [
  {
    label: "Facebook",
    path: "M15 8h-2a2 2 0 0 0-2 2v2H9v3h2v7h3v-7h2.2l.8-3H14v-1.2c0-.5.2-.8.8-.8H16V8z",
  },
  {
    label: "Instagram",
    path: "M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4zm8 1.8H8A2.2 2.2 0 0 0 5.8 8v8A2.2 2.2 0 0 0 8 18.2h8a2.2 2.2 0 0 0 2.2-2.2V8A2.2 2.2 0 0 0 16 5.8zM12 8.4A3.6 3.6 0 1 1 8.4 12 3.6 3.6 0 0 1 12 8.4zm0 1.6a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm4.35-2.55a.85.85 0 1 1-.85.85.85.85 0 0 1 .85-.85z",
  },
  {
    label: "X",
    path: "M6 5h2.4l3.1 4.2L15.2 5H18l-4.7 6.1L18.4 19h-2.4l-3.4-4.6L8.6 19H6l5-6.5L6 5z",
  },
  {
    label: "LinkedIn",
    path: "M4.7 3.4A2.1 2.1 0 1 1 2.6 5.5 2.1 2.1 0 0 1 4.7 3.4zM3 8.6h3.4V21H3zm5.6 0H12v1.7h.1c.5-1 1.7-2 3.5-2 3.7 0 4.4 2.4 4.4 5.6V21H16.6v-5.5c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V21H8.6z",
  },
] as const;

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
        { href: "/instructor", label: tTeach("ctaStudio") },
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
        { href: "/login", label: tCommon("signIn") },
        { href: "/register", label: tCommon("getStarted") },
        { href: "/privacy", label: t("suPrivacy") },
        { href: "/terms", label: t("suTerms") },
        { href: `mailto:${CONTACT_EMAIL}`, label: t("suSupport"), external: true },
      ],
    },
  ];

  return (
    <footer id="about" className="bg-brand-navy text-white">
      <div className="container-page pt-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <LogoMark variant="inverse" className="max-h-9 max-w-[11rem]" />
            <p id="mission" className="mt-6 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t("missionLine")}
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">{t("tagline")}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-4 inline-block text-sm font-medium text-[#b7dcff] hover:text-white">
              {CONTACT_EMAIL}
            </a>
            <p className="mt-8 text-sm font-semibold text-white">{t("follow")}</p>
            <ul className="mt-3 flex gap-2">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <span
                    aria-label={social.label}
                    role="img"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path fill="currentColor" d={social.path} />
                    </svg>
                  </span>
                </li>
              ))}
            </ul>
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
