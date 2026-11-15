"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { THEME_EVENT } from "./script";

/** Reapply the head script's theme before painting a client-side navigation. */
export function ThemeSync() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    window.dispatchEvent(new Event(THEME_EVENT));
  }, [pathname]);
  return null;
}
