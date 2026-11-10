import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function TeachOnMultivateSection() {
  const t = await getTranslations("landing.teach");
  const points = [t("panelLi1"), t("panelLi2"), t("panelLi3")];

  return (
    <section id="teach" className="bg-brand-sky">
      <div className="container-page py-16 sm:py-20 lg:py-24">
        <h2 className="max-w-4xl text-[2.75rem] font-extrabold leading-[0.95] tracking-tight text-[#011B33] sm:text-6xl lg:text-7xl">
          {`${t("title")}.`}
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#011B33]/70">{t("body")}</p>
        <ul className="mt-8 max-w-xl space-y-3">
          {points.map((point) => (
            <li key={point} className="flex gap-3 text-sm leading-6 text-[#011B33]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" strokeWidth={2.5} aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register?intent=instructor"
            className="inline-flex h-[50px] items-center justify-center rounded-[5px] bg-brand-accent px-8 text-[16px] font-medium text-white hover:bg-brand-accent-dark"
          >
            {t("ctaInstructor")}
          </Link>
          <Link
            href="/login?from=/instructor/studio"
            className="inline-flex h-[50px] items-center justify-center rounded-[5px] border border-[#011B33]/20 bg-white px-8 text-[16px] font-medium text-[#011B33] hover:border-brand-accent hover:text-brand-accent"
          >
            {t("ctaStudio")}
          </Link>
        </div>
      </div>
    </section>
  );
}
