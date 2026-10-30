import Link from "next/link";

/** `bordered={false}` on the landing page, which runs without section dividers. */
export function SiteFooter({ bordered = true }: { bordered?: boolean }) {
  return (
    <footer className={bordered ? "border-t" : undefined}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-heading text-base text-foreground">rello.</span> One resume. Every opportunity.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/?home" className="hover:text-foreground">
            About Rello
          </Link>
          <Link href="/settings" className="hover:text-foreground">
            Settings
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
