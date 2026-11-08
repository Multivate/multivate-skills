"use client";

import { StudentPageHero, StudentSurface } from "@/components/dashboard/StudentPageHero";
import { Link } from "@/i18n/navigation";

export default function SubscribePage() {
  return (
    <>
      <StudentPageHero
        title="Subscribe"
        subtitle="Stay on a learning rhythm. There is no all-you-can-eat plan — you enroll in real courses, then we remind you to show up."
      />
      <StudentSurface>
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded border border-[#d1d7dc] p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6a6f73]">Personal</p>
            <h2 className="mt-2 text-xl font-bold">Weekly learning time</h2>
            <p className="mt-2 text-sm text-[#6a6f73]">
              Set days and a time. We count visits and minutes you actually watch, then remind you when a session is due.
            </p>
            <Link href="/dashboard/courses?tab=tools" className="mt-5 inline-flex h-11 items-center bg-[#1457D0] px-4 text-sm font-bold text-white">
              Open learning tools
            </Link>
          </section>
          <section className="rounded border border-[#d1d7dc] p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6a6f73]">Courses</p>
            <h2 className="mt-2 text-xl font-bold">Enroll course by course</h2>
            <p className="mt-2 text-sm text-[#6a6f73]">
              Prices are listed in naira on each course. Pay from checkout, then the course appears in My learning.
            </p>
            <Link href="/courses" className="mt-5 inline-flex h-11 items-center border border-[#1457D0] px-4 text-sm font-bold text-[#1457D0]">
              Explore catalog
            </Link>
          </section>
          <section className="rounded border border-[#d1d7dc] p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6a6f73]">Teams</p>
            <h2 className="mt-2 text-xl font-bold">For organizations</h2>
            <p className="mt-2 text-sm text-[#6a6f73]">
              Training for a school or company? Email us with the skills you need — we will not invent a fake team SKU here.
            </p>
            <a href="mailto:info@multivate.com.ng" className="mt-5 inline-flex h-11 items-center border border-[#1c1d1f] px-4 text-sm font-bold">
              info@multivate.com.ng
            </a>
          </section>
        </div>
      </StudentSurface>
    </>
  );
}
