"use client";

import { MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { MentorChatPanel } from "@/components/mentors/MentorChatPanel";
import { MentorAvatarWithCount } from "@/components/mentors/MentorPeopleCountDot";
import type { PublicMentor } from "@/components/landing/MentorsSection";

type MentorDetail = PublicMentor & {
  languages_spoken: string;
  career_tips: string | null;
  expertise_areas: string;
};

export function MentorProfileClient({ mentor }: { mentor: MentorDetail }) {
  const [chatOpen, setChatOpen] = useState(false);
  const photo = resolveAvatarUrl(mentor.photo_url);

  return (
    <>
      <section className="border-b border-slate-100 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="container-page flex flex-col gap-8 md:flex-row md:items-start">
          <MentorAvatarWithCount
            photo={photo}
            name={mentor.full_name}
            peopleHelped={mentor.people_helped_count ?? 0}
            activeConversations={mentor.active_conversations_count ?? 0}
            sizeClass="h-32 w-32"
            ringClass="ring-4 ring-brand-accent/70 dark:ring-brand-accent/80"
            dotClass="h-7 min-w-7 text-[11px]"
            imageSizes="128px"
            priority
          />
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-brand-ink dark:text-white">{mentor.full_name}</h1>
            <p className="mt-1 text-lg text-slate-600 dark:text-slate-400">{mentor.headline}</p>
            {mentor.field_of_work ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand-accent">{mentor.field_of_work}</p>
            ) : null}
            {mentor.city ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 text-brand-accent" />
                {mentor.city}
                {mentor.years_in_germany != null ? ` · ${mentor.years_in_germany}+ years in Germany` : ""}
                {mentor.origin_country ? ` · from ${mentor.origin_country}` : ""}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="btn-cta-accent mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" />
              Ask {mentor.full_name.split(" ")[0]} a question
            </button>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 py-12 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-lg font-bold text-brand-ink dark:text-white">Their story</h2>
            <p className="mt-3 whitespace-pre-wrap text-slate-600 leading-relaxed dark:text-slate-400">{mentor.bio}</p>
          </div>
          {mentor.career_tips ? (
            <div className="rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-6">
              <h2 className="text-lg font-bold text-brand-ink dark:text-white">Career advice</h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{mentor.career_tips}</p>
            </div>
          ) : null}
        </div>
        <aside className="space-y-6">
          {mentor.expertise_areas ? (
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Expertise</h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{mentor.expertise_areas}</p>
            </div>
          ) : null}
          {mentor.german_level ? (
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">German level</h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{mentor.german_level}</p>
            </div>
          ) : null}
          {mentor.languages_spoken ? (
            <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Languages</h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{mentor.languages_spoken}</p>
            </div>
          ) : null}
        </aside>
      </section>

      <MentorChatPanel
        mentorSlug={mentor.slug}
        mentorName={mentor.full_name}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </>
  );
}
