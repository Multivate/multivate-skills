"use client";

import { useEffect, type RefObject } from "react";

let lockCount = 0;
let pageLockCount = 0;
let savedY = 0;

function canScroll(el: HTMLElement, deltaY: number) {
  const top = el.scrollTop;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 1) return false;
  if (deltaY < 0) return top > 0;
  return top < max - 1;
}

export function useBodyScrollLock(
  locked: boolean,
  scrollRef?: RefObject<HTMLElement | null>,
  mode: "page" | "events" = "page",
) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const pinPage = mode === "page";

    if (lockCount === 0) {
      savedY = window.scrollY;
    }
    if (pinPage && pageLockCount === 0) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.top = `-${savedY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }
    lockCount += 1;
    if (pinPage) pageLockCount += 1;

    function insidePanel(target: EventTarget | null) {
      const panel = scrollRef?.current;
      return Boolean(panel && target instanceof Node && panel.contains(target));
    }

    function onWheel(event: WheelEvent) {
      if (insidePanel(event.target) && scrollRef?.current && canScroll(scrollRef.current, event.deltaY)) {
        return;
      }
      event.preventDefault();
    }

    function onTouchMove(event: TouchEvent) {
      if (insidePanel(event.target)) return;
      event.preventDefault();
    }

    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchmove", onTouchMove);
      lockCount -= 1;
      if (pinPage) pageLockCount -= 1;
      if (pageLockCount <= 0) {
        pageLockCount = 0;
        html.style.overflow = "";
        body.style.overflow = "";
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        if (lockCount <= 0) window.scrollTo(0, savedY);
      }
      if (lockCount < 0) lockCount = 0;
    };
  }, [locked, scrollRef, mode]);
}
