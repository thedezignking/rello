"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/**
 * Whether the page has scrolled away from the top. Sticky headers use it to
 * show their bottom edge only once content is passing under them.
 */
export function useScrolled(offset = 4) {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > offset,
    () => false,
  );
}
