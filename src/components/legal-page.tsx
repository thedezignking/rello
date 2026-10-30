import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";

/** Shared layout for the privacy policy and terms. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-heading text-4xl font-medium tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <p className="mt-6 rounded-lg border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
          Draft. This page describes how Rello works today and must be reviewed by a lawyer before public launch.
        </p>
        <div className="mt-8 flex flex-col gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:tracking-tight [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
