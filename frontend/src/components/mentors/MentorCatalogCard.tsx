"use client";

import { ArrowRight, MapPin, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import type { PublicMentor } from "@/components/landing/MentorsSection";
import { hasMentorChatSession } from "@/components/mentors/MentorChatPanel";
import { MentorAvatarWithCount } from "@/components/mentors/MentorPeopleCountDot";
import { resolveAvatarUrl } from "@/lib/avatar-url";

type Props = {
  mentor: PublicMentor;
  layout?: "grid" | "scroll";
  onMessage: (slug: string) => void;
};

export function MentorCatalogCard({ mentor, layout = "grid", onMessage }: Props) {
  const t = useTranslations("mentors");
  const photo = resolveAvatarUrl(mentor.photo_url);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    setContinuing(hasMentorChatSession(mentor.slug));
  }, [mentor.slug]);

  const shellClass =
    layout === "scroll"
      ? "w-[min(100%,20rem)] min-w-[min(100%,18rem)] max-w-[20rem] shrink-0 snap-start sm:min-w-[18.5rem]"
      : "w-full min-w-0";

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-xl border border-brand-accent/25 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-accent/45 hover:shadow-md dark:border-brand-accent/30 dark:bg-slate-900 ${shellClass}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-accent/[0.04] dark:bg-brand-accent/8">
        <div className="absolute inset-0 flex items-center justify-center">
          <MentorAvatarWithCount
            photo={photo}
            name={mentor.full_name}
            peopleHelped={mentor.people_helped_count ?? 0}
            activeConversations={mentor.active_conversations_count ?? 0}
          />
        </div>
        {mentor.is_featured ? (
          <span className="absolute left-2 top-2 rounded-md bg-brand-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Featured
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-[0.9375rem] font-bold text-slate-900 transition group-hover:text-brand-primary dark:text-white sm:text-base">
          {mentor.full_name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          {mentor.headline}
        </p>
        {mentor.city ? (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-accent" aria-hidden />
            <span className="truncate">
              {mentor.city}
              {mentor.origin_country ? `, from ${mentor.origin_country}` : ""}
            </span>
          </p>
        ) : null}
        <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{mentor.bio}</p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onMessage(mentor.slug)}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-accent px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-accent-dark active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            {continuing ? t("continueChat") : t("messageCta")}
          </button>
          <Link
            href={`/mentors/${mentor.slug}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-brand-primary hover:text-brand-primary dark:border-slate-700 dark:text-slate-200"
            aria-label={`View ${mentor.full_name}`}
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
