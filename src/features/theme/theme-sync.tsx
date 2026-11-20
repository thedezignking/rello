"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { THEME_EVENT } from "./script";

/** Reapply the head script's theme before painting a client-side navigation. */
export function ThemeSync() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    // Use the committed route rather than relying on URL update timing.
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { pathname } }));
  }, [pathname]);
  return null;
}
