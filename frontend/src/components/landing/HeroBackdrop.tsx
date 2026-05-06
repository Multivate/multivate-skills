import { Plane } from "lucide-react";

/** Subtle map hint + dotted path (Africa → Germany). */
export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute -left-[8%] top-0 h-full w-[115%] opacity-[0.035] sm:opacity-[0.045]"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          fill="#4C3BCF"
          d="M180 380c40-20 90-35 140-30 60 6 120 40 180 55 100 28 200 10 300-25 120-42 220-100 280-160l20 280H0V380z"
        />
        <ellipse cx="900" cy="200" rx="80" ry="45" fill="#4C3BCF" opacity="0.4" />
      </svg>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M 110 392 Q 260 340 380 275 T 608 168"
          fill="none"
          stroke="#4C3BCF"
          strokeWidth="1.75"
          strokeDasharray="5 7"
          strokeLinecap="round"
          opacity="0.28"
        />
      </svg>

      <div className="absolute left-[52%] top-[24%] flex h-8 w-8 items-center justify-center rounded-full border border-brand-primary/25 bg-white text-brand-primary shadow-sm sm:left-[54%] sm:top-[28%] sm:h-9 sm:w-9">
        <Plane className="h-3.5 w-3.5 -rotate-12 sm:h-4 sm:w-4" strokeWidth={2} />
      </div>
    </div>
  );
}
