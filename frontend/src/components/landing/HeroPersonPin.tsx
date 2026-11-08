"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";

export function HeroPersonPin({
  src,
  english,
  german,
  left,
  top,
  delay,
  objectClass,
  priority,
}: {
  src: StaticImageData;
  english: string;
  german: string;
  left: string;
  top: string;
  delay: string;
  objectClass: string;
  priority?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left, top }}
    >
      <div className="animate-floaty max-lg:animate-none" style={{ animationDelay: delay }}>
        <div className="relative">
          <div
            className={`pointer-events-none absolute bottom-full left-1/2 z-10 w-max max-w-[7.5rem] -translate-x-1/2 pb-1 text-center transition duration-200 ${
              open ? "opacity-100" : "opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
            }`}
          >
            <p className="text-[11px] font-semibold leading-tight text-brand-navy">{english}</p>
            <p className="text-[11px] font-semibold leading-tight text-brand-accent">{german}</p>
          </div>
          <button
            type="button"
            className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-white/80 sm:h-14 sm:w-14"
            aria-label={`${english} ${german}`}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            onBlur={() => setOpen(false)}
          >
            <Image
              src={src}
              alt=""
              width={112}
              height={112}
              priority={priority}
              className={`h-full w-full object-cover ${objectClass}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
