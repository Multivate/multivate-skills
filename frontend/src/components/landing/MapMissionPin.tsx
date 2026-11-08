"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import whiteLogo from "../../../public/MULTIVATE LOGO WHITE.png";

export function MapMissionPin() {
  const t = useTranslations("footer");

  return (
    <div className="group pointer-events-auto absolute left-[40%] top-[44%] z-30 -translate-x-1/2 -translate-y-1/2">
      <button
        type="button"
        className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full bg-brand-navy shadow-[0_6px_16px_rgba(12,27,74,0.28)] ring-2 ring-[#9fd0ff]"
        aria-label={t("coMission")}
      >
        <Image src={whiteLogo} alt="" width={52} height={52} className="h-11 w-11 object-cover object-top" />
      </button>
      <div className="pointer-events-none absolute left-1/2 top-full z-20 w-[min(15.5rem,calc(100vw-2.5rem))] -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:pt-[18px]">
        <div role="tooltip" className="rounded-[5px] bg-white px-3.5 py-3 text-left shadow-[0_10px_28px_rgba(12,27,74,0.16)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-accent">{t("coMission")}</p>
          <p className="mt-1 text-[15px] font-extrabold leading-5 text-[#011B33]">{t("missionLine")}</p>
          <p className="mt-1.5 text-[13px] font-normal leading-5 text-[#011B33]">{t("tagline")}</p>
        </div>
      </div>
    </div>
  );
}
