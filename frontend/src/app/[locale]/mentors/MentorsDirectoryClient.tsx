"use client";

import { MapPin, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { MentorChatPanel } from "@/components/mentors/MentorChatPanel";
import { MentorAvatarWithCount } from "@/components/mentors/MentorPeopleCountDot";
import type { PublicMentor } from "@/components/landing/MentorsSection";

export function MentorsDirectoryClient({ mentors }: { mentors: PublicMentor[] }) {
  const [chatSlug, setChatSlug] = useState<string | null>(null);
  const active = mentors.find((m) => m.slug === chatSlug);

  return (
    <section className="container-page py-12">
      {mentors.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 px-6 py-16 text-center text-neutral-500">
          No mentors yet.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {mentors.map((mentor) => {
            const photo = resolveAvatarUrl(mentor.photo_url);
            return (
              <article
                key={mentor.id}
                className="rounded-md border border-neutral-200/90 bg-brand-surface p-6 shadow-sm transition hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex gap-4">
                  <MentorAvatarWithCount
                    photo={photo}
                    name={mentor.full_name}
                    peopleHelped={mentor.people_helped_count ?? 0}
                    activeConversations={mentor.active_conversations_count ?? 0}
                    sizeClass="h-20 w-20"
                    ringClass="ring-2 ring-brand-accent/70 dark:ring-brand-accent/80"
                    imageSizes="80px"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-brand-ink dark:text-white">{mentor.full_name}</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{mentor.headline}</p>
                    {mentor.city ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                        <MapPin className="h-3 w-3 text-brand-accent" />
                        {mentor.city}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 line-clamp-4 text-sm text-neutral-500 dark:text-neutral-400">{mentor.bio}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setChatSlug(mentor.slug)}
                    className="btn-cta-accent inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </button>
                  <Link
                    href={`/mentors/${mentor.slug}`}
                    className="rounded-md border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:border-brand-primary hover:text-brand-primary dark:border-zinc-700 dark:text-neutral-200"
                  >
                    View profile
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

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
