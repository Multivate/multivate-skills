"use client";

import Image from "next/image";

export function mentorPeopleCount(peopleHelped: number, activeConversations: number): number {
  if (peopleHelped > 0) return peopleHelped;
  return activeConversations;
}

type Props = {
  peopleHelped: number;
  activeConversations: number;
  className?: string;
};

export function MentorPeopleCountDot({ peopleHelped, activeConversations, className = "" }: Props) {
  const count = mentorPeopleCount(peopleHelped, activeConversations);
  if (count <= 0) return null;

  const label = count === 1 ? "1 person guided" : `${count} people guided`;

  return (
    <span
      className={`absolute bottom-0 right-0 z-10 flex h-6 min-w-6 translate-x-1/4 translate-y-1/4 items-center justify-center rounded-full border-2 border-white bg-brand-accent px-1 text-[10px] font-extrabold leading-none text-white shadow-md transition group-hover:scale-110 dark:border-slate-900 ${className}`}
      aria-label={label}
      title={label}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

type MentorAvatarProps = {
  photo: string | null;
  name: string;
  peopleHelped?: number;
  activeConversations?: number;
  sizeClass?: string;
  ringClass?: string;
  dotClass?: string;
  imageSizes?: string;
  priority?: boolean;
};

export function MentorAvatarWithCount({
  photo,
  name,
  peopleHelped = 0,
  activeConversations = 0,
  sizeClass = "h-24 w-24",
  ringClass = "ring-4 ring-brand-accent/70 dark:ring-brand-accent/80",
  dotClass = "",
  imageSizes = "96px",
  priority = false,
}: MentorAvatarProps) {
  return (
    <div
      className={`relative shrink-0 rounded-full shadow-md transition ${sizeClass} ${ringClass} group-hover:ring-brand-accent`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full">
        {photo ? (
          <Image src={photo} alt="" fill className="object-cover" sizes={imageSizes} priority={priority} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-primary/15 text-2xl font-bold text-brand-primary">
            {name.slice(0, 1)}
          </div>
        )}
      </div>
      <MentorPeopleCountDot
        peopleHelped={peopleHelped}
        activeConversations={activeConversations}
        className={dotClass}
      />
    </div>
  );
}
