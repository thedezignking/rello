import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import "@/features/home/landing.css";

const DOCUMENTS = [
  { href: "/guide", label: "Getting started" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
];

export function DocumentPage({ title, href, description, updated, children }: {
  title: string;
  href: string;
  description?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="landing-shell">
      <div className="landing-guides" aria-hidden="true" />
      <LandingHeader />
      <main className="document-page">
        <aside className="document-sidebar">
          <Link href="/?home" className="document-back"><ArrowLeftIcon className="size-3.5" /> Back to Rello</Link>
          <nav aria-label="Resources" className="document-nav">
            {DOCUMENTS.map((document) => <Link key={document.href} href={document.href} aria-current={href === document.href ? "page" : undefined}>{document.label}</Link>)}
          </nav>
        </aside>
        <article className="document-article">
          <header className="document-heading">
            <h1>{title}</h1>
            {description && <p className="document-description">{description}</p>}
            {updated && <p className="document-updated">Last updated {updated}</p>}
          </header>
          <div className="document-prose">{children}</div>
        </article>
      </main>
      <SiteFooter variant="full" />
    </div>
  );
}
