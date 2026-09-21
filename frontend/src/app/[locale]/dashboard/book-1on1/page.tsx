import { Suspense } from "react";
import { BookOneOnOneClient } from "@/components/dashboard/BookOneOnOneClient";

export default function BookOneOnOnePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<p className="text-sm text-brand-ink/55">Loading…</p>}>
        <BookOneOnOneClient />
      </Suspense>
    </div>
  );
}
