import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-white py-20 sm:py-28">
        <div className="container-page max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-brand-ink sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-600">{t("body")}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/" className="btn-cta-accent inline-flex h-[50px] items-center px-8">
              {t("home")}
            </Link>
            <Link href="/courses" className="inline-flex h-[50px] items-center text-[15px] font-medium text-brand-accent hover:text-brand-accent-dark">
              {t("courses")}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
