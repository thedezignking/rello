// Plain module (not "use client") so the server layout can inline it.

export const THEME_KEY = "rello.theme";
export const THEME_EVENT = "rello-theme";

/**
 * Runs in <head> before first paint so there's no flash of the wrong theme.
 * Sets data-theme to the saved choice, or follows the system while the
 * choice is "system" (including when the system setting changes later).
 */
export const themeScript = `(function(){try{var k="${THEME_KEY}",m=matchMedia("(prefers-color-scheme: dark)");function a(){var t=localStorage.getItem(k)||"system",d=t==="dark"||(t==="system"&&m.matches),r=document.documentElement;r.dataset.theme=d?"dark":"light";r.style.colorScheme=d?"dark":"light"}a();m.addEventListener("change",a);addEventListener("${THEME_EVENT}",a)}catch(e){}})();`;
