"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MentorCatalogCard } from "@/components/mentors/MentorCatalogCard";
import { MentorChatPanel } from "@/components/mentors/MentorChatPanel";

export type PublicMentor = {
  id: string;
  slug: string;
  full_name: string;
  headline: string;
  bio: string;
  photo_url: string | null;
  city: string;
  origin_country: string | null;
  years_in_germany: number | null;
  german_level: string | null;
  field_of_work: string | null;
  expertise_areas: string;
  is_featured: boolean;
  people_helped_count?: number;
  active_conversations_count?: number;
};

export function MentorsSection({ initialMentors = [] }: { initialMentors?: PublicMentor[] }) {
  const t = useTranslations("mentors");
  const tCommon = useTranslations("common");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [mentors, setMentors] = useState<PublicMentor[]>(initialMentors);
  const [loading, setLoading] = useState(initialMentors.length === 0);
  const [chatSlug, setChatSlug] = useState<string | null>(null);
  const active = mentors.find((m) => m.slug === chatSlug);

  useEffect(() => {
    if (initialMentors.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/mentors?featured=false&limit=50");
        const data = (await res.json().catch(() => null)) as unknown;
        if (cancelled) return;
        setMentors(Array.isArray(data) ? (data as PublicMentor[]) : []);
      } catch {
        if (!cancelled) setMentors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialMentors.length]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.72), behavior: "smooth" });
  }, []);

  const useGrid = mentors.length <= 4;

  return (
    <section id="mentors" className="section-y border-y border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-accent">{t("eyebrow")}</p>
            <h2 className="heading-section mt-2 text-2xl sm:text-3xl lg:text-[2rem]">{t("heading")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">{t("subheading")}</p>
          </div>
          <Link
            href="/mentors"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-primary transition hover:text-brand-primary-dark"
          >
            {tCommon("viewAllMentors")}
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-slate-500">{t("loading")}</p>
        ) : mentors.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{t("empty")}</p>
            <Link href="/mentors" className="btn-outline-brand mt-5 inline-flex text-sm !py-2.5">
              {t("viewAll")}
            </Link>
          </div>
        ) : useGrid ? (
          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {mentors.map((mentor) => (
              <li key={mentor.id} className={mentors.length === 1 ? "mx-auto w-full max-w-sm sm:max-w-md" : undefined}>
                <MentorCatalogCard mentor={mentor} layout="grid" onMessage={setChatSlug} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="relative mt-10">
            <button
              type="button"
              aria-label={t("scrollLeft")}
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-brand-accent/40 hover:bg-brand-accent/5 md:flex"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={t("scrollRight")}
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-brand-accent/40 hover:bg-brand-accent/5 md:flex"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>

            <div
              ref={scrollerRef}
              className="flex gap-5 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory md:pl-12 md:pr-12 [&::-webkit-scrollbar]:hidden"
            >
              {mentors.map((mentor) => (
                <MentorCatalogCard key={mentor.id} mentor={mentor} layout="scroll" onMessage={setChatSlug} />
              ))}
            </div>
          </div>
        )}
      </div>

      {active ? (
        <MentorChatPanel
          mentorSlug={active.slug}
          mentorName={active.full_name}
          open={Boolean(chatSlug)}
          onClose={() => setChatSlug(null)}
        />
      ) : null}
    </section>
  );
}
