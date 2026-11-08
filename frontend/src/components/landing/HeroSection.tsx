import Image from "next/image";
import { getTranslations } from "next-intl/server";
import headHow from "../../../public/marketing/heads/head-how.webp";
import head2 from "../../../public/marketing/heads/head-2.png";
import head3 from "../../../public/marketing/heads/head-3.png";
import head4 from "../../../public/marketing/heads/head-4.png";
import head5 from "../../../public/marketing/heads/head-5.png";
import { Link } from "@/i18n/navigation";
import { MapMissionPin } from "@/components/landing/MapMissionPin";

export async function HeroSection() {
  const t = await getTranslations("hero");

  const people = [
    { src: head4, english: t("phoneHelloEn"), german: t("phoneHelloDe"), left: "18%", top: "24%", delay: "0s", object: "object-[center_18%]" },
    { src: head2, english: t("phoneDayEn"), german: t("phoneDayDe"), left: "78%", top: "18%", delay: "0.6s", object: "object-[center_18%]" },
    { src: head3, english: t("phoneStudyEn"), german: t("phoneStudyDe"), left: "66%", top: "58%", delay: "1s", object: "object-[center_18%]" },
    { src: headHow, english: t("phoneHowEn"), german: t("phoneHowDe"), left: "16%", top: "76%", delay: "0.35s", object: "object-center" },
    { src: head5, english: t("phoneThanksEn"), german: t("phoneThanksDe"), left: "80%", top: "78%", delay: "1.3s", object: "object-[center_18%]" },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand-sky text-[#011B33] lg:min-h-[763px]">
        <div className="container-page relative py-10 sm:py-14 lg:min-h-[763px] lg:py-0 lg:pt-[9.5rem]">
          <div className="flex max-w-[560px] flex-col lg:min-h-[calc(763px-9.5rem)] lg:pb-8">
            <div>
              <h1 className="mb-2.5 text-[1.875rem] font-extrabold leading-[1.15] tracking-normal text-[#011B33] sm:text-[2.5rem] sm:leading-[1.2] lg:text-[48px]">
                {t("title")} {t("titleHighlight")}
              </h1>
              <p className="max-w-[560px] text-[17px] font-normal leading-7 tracking-[-0.2px] text-[#011B33] sm:text-[20px] sm:leading-[30px]">
                {t("subtitle")}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-7">
                <Link
                  href="/register"
                  className="inline-flex h-[50px] items-center rounded-[5px] bg-brand-accent px-8 text-[16px] font-medium text-white transition duration-200 hover:bg-brand-accent-dark"
                >
                  {t("createAccount")}
                </Link>
                <Link href="/login" className="text-[15px] font-medium text-brand-accent hover:text-brand-accent-dark">
                  {t("orSignIn")}
                </Link>
              </div>
            </div>
            <div className="mt-0 lg:mt-auto lg:mb-[5.5rem]">
              <p className="max-w-[12rem] text-[15px] leading-snug text-[#011B33]">{t("trustLine")}</p>
              <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <li>
                  <Link href="/courses?search=German" className="text-[1.15rem] font-extrabold tracking-[-0.04em] text-[#011B33] hover:text-brand-accent">
                    {t("trustGerman")}
                  </Link>
                </li>
                <li>
                  <Link href="/courses?search=tech" className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-[#011B33] hover:text-brand-accent">
                    {t("trustTechnology")}
                  </Link>
                </li>
                <li>
                  <Link href="/mentors" className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[#011B33] hover:text-brand-accent">
                    {t("trustMentors")}
                  </Link>
                </li>
                <li>
                  <Link href="/courses?search=career" className="text-[1.05rem] font-extrabold tracking-[-0.02em] text-[#011B33] hover:text-brand-accent">
                    {t("trustWork")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="relative mt-8 h-[22rem] w-full sm:mt-10 sm:h-[26rem] lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-auto lg:w-[52%]">
            <div className="pointer-events-none absolute inset-0 z-20">
              <div className="absolute left-1/2 top-1/2 h-full -translate-x-1/2 -translate-y-1/2 lg:left-0 lg:h-[92%] lg:translate-x-0">
                <div className="animate-map-pan relative h-full w-max">
                  <img src="/marketing/germany-outline.svg?v=2" alt="" className="h-full w-auto max-w-none" />
                  <MapMissionPin />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 z-10">
            {people.map((person, index) => (
              <div
                key={person.english}
                className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: person.left, top: person.top }}
              >
                <div className="animate-floaty" style={{ animationDelay: person.delay }}>
                  <div className="relative">
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 w-max max-w-[7rem] -translate-x-1/2 pb-1 text-center opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                      <p className="text-[11px] font-semibold leading-tight text-brand-navy">{person.english}</p>
                      <p className="text-[11px] font-semibold leading-tight text-brand-accent">{person.german}</p>
                    </div>
                    <button
                      type="button"
                      className="h-11 w-11 overflow-hidden rounded-full sm:h-14 sm:w-14"
                      aria-label={`${person.english} ${person.german}`}
                    >
                      <Image
                        src={person.src}
                        alt=""
                        width={112}
                        height={112}
                        priority={index < 3}
                        className={`h-full w-full object-cover ${person.object}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
