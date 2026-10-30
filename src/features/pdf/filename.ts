const clean = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");

/**
 * "Amara Okafor" + "Product Designer — Acme" → "Amara_Okafor_Product_Designer_Acme.pdf"
 * Keeps letters (any script) and digits, drops everything else, caps the length.
 */
export function pdfFilename(name: string, title: string) {
  const t = /^untitled resume$/i.test(title.trim()) ? "" : title;
  const parts = [clean(name), clean(t)].filter(Boolean);
  // Don't repeat the name when the title already starts with it.
  if (parts.length === 2 && parts[1].toLowerCase().startsWith(parts[0].toLowerCase())) parts.shift();
  const base = parts.join("_").slice(0, 80).replace(/_+$/, "") || "Resume";
  return `${base}.pdf`;
}
