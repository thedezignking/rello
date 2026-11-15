import { DocumentPage } from "@/components/document-page";

/** Shared layout for the privacy policy and terms. */
export function LegalPage({ title, href, updated, children }: { title: string; href: string; updated: string; children: React.ReactNode }) {
  return (
    <DocumentPage title={title} href={href} updated={updated}>
      {children}
    </DocumentPage>
  );
}
