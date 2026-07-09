"use client";

import { useEffect, useRef } from "react";

export const ANALYTICS_POLL_MS = 15_000;

export function useRealtimePoll(enabled: boolean, onPoll: () => void | Promise<void>, intervalMs = ANALYTICS_POLL_MS) {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      void onPollRef.current();
    };

    run();
    const id = window.setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, intervalMs]);
}
