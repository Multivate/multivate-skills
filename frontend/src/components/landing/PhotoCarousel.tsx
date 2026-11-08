"use client";

import { useRef, useState } from "react";
import { Compass, MessageCircle, TrendingUp } from "lucide-react";

const icons = {
  message: MessageCircle,
  compass: Compass,
  trend: TrendingUp,
} as const;

export type StorySlide = {
  title: string;
  body: string;
  image: string;
  icon: keyof typeof icons;
};

export function PhotoCarousel({ slides, label }: { slides: StorySlide[]; label: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function sync() {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.min(slides.length - 1, Math.max(0, index)));
  }

  function go(index: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActive(index);
  }

  return (
    <div>
      <div
        ref={scroller}
        onScroll={sync}
        aria-label={label}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide) => {
          const Icon = icons[slide.icon];
          return (
            <article
              key={slide.title}
              className="relative h-[26rem] w-full shrink-0 snap-center overflow-hidden rounded-2xl sm:h-[32rem] lg:h-[600px]"
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/45 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 max-w-2xl p-6 text-white sm:p-10 lg:p-12">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#b7dcff] text-brand-navy">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <h3 className="text-2xl font-extrabold leading-tight sm:text-4xl">{slide.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/90 sm:text-base">{slide.body}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-5 flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            aria-label={slide.title}
            aria-current={index === active ? "true" : undefined}
            onClick={() => go(index)}
            className={
              index === active
                ? "h-2.5 w-6 rounded-full bg-brand-navy"
                : "h-2.5 w-2.5 rounded-full bg-brand-navy/30"
            }
          />
        ))}
      </div>
    </div>
  );
}
