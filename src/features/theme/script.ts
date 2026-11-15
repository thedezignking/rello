// Plain module (not "use client") so the server layout can inline it.

export const THEME_KEY = "rello.theme";
export const THEME_EVENT = "rello-theme";

/**
 * Runs in <head> before first paint so there's no flash of the wrong theme.
 * Public pages choose light before the browser paints. App pages use the
 * saved choice or system preference, without changing that saved choice.
 */
export const themeScript = `(function(){try{
  var k="${THEME_KEY}",m=matchMedia("(prefers-color-scheme: dark)"),r=document.documentElement;
  function a(){
    var p=location.pathname,light=["/","/privacy","/privacy/","/terms","/terms/","/guide","/guide/"].includes(p),t="system";
    try{t=localStorage.getItem(k)||"system"}catch(e){}
    var d=!light&&(t==="dark"||(t==="system"&&m.matches));
    r.dataset.theme=d?"dark":"light";
    if(light)r.dataset.publicPage="true";else delete r.dataset.publicPage;
    r.style.colorScheme=light?"only light":d?"dark":"light";
    r.style.backgroundColor=light?"#f8f9f6":"";
  }
  a();m.addEventListener("change",a);addEventListener("${THEME_EVENT}",a);addEventListener("pageshow",a);
}catch(e){}})();`;
