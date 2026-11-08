import { Suspense } from "react";
import { BookOneOnOneClient } from "@/components/dashboard/BookOneOnOneClient";
import { StudentSurface } from "@/components/dashboard/StudentPageHero";

export default function BookOneOnOnePage() {
  return (
    <StudentSurface>
      <Suspense
        fallback={
          <div className="min-h-[70vh] animate-pulse space-y-6">
            <div className="h-8 w-56 rounded bg-brand-ink/10" />
            <div className="h-40 rounded-[5px] bg-brand-ink/10" />
          </div>
        }
      >
        <BookOneOnOneClient />
      </Suspense>
    </StudentSurface>
  );
}
