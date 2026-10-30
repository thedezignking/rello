"use client";

import { createContext, use } from "react";

// In thumbnails the resume is a picture of a page, not part of the page's
// own outline. These render the templates' headings as plain text there, so
// a gallery of previews doesn't add dozens of h1/h2s for search engines and
// screen readers. Full previews, the editor and the PDF keep real headings.

const PlainHeadings = createContext(false);

export function PlainHeadingsProvider({ plain, children }: { plain?: boolean; children: React.ReactNode }) {
  return <PlainHeadings value={!!plain}>{children}</PlainHeadings>;
}

export function H1(props: React.ComponentProps<"h1">) {
  return use(PlainHeadings) ? <p {...props} /> : <h1 {...props} />;
}

export function H2(props: React.ComponentProps<"h2">) {
  return use(PlainHeadings) ? <p {...props} /> : <h2 {...props} />;
}
