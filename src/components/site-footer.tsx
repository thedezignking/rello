import Link from "next/link";
import { ThemeToggle } from "@/features/theme/theme";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/?home#how", label: "How it works" },
      { href: "/?home#templates", label: "Templates" },
      { href: "/?home#pricing", label: "Pricing" },
      { href: "/?home#faq", label: "Questions" },
    ],
  },
  {
    title: "App",
    links: [
      { href: "/resumes", label: "Your resumes" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

function Wordmark() {
  return (
    <Link href="/?home" className="font-heading text-xl font-medium tracking-tight text-foreground">
      rello<span className="text-primary">.</span>
    </Link>
  );
}

/**
 * `full` on the landing page: brand, link columns and a bottom bar, like a
 * product site. Inside the app a single quiet row, so it never competes with
 * the work above it.
 */
export function SiteFooter({ variant = "compact" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return (
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="text-xs">One resume. Every opportunity.</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { href: "/?home", label: "About Rello" },
              { href: "/settings", label: "Settings" },
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    );
  }

  return (
    <footer>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-3 gap-x-6 gap-y-10 py-14 lg:grid-cols-[1fr_repeat(3,auto)] lg:gap-x-20">
          <div className="col-span-3 flex flex-col items-start gap-3 lg:col-span-1">
            <Wordmark />
            <p className="max-w-xs text-sm text-muted-foreground">
              Make one clean resume, then tailor a copy to each job, line by line.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">{col.title}</h2>
              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 pt-2 pb-8 text-xs text-muted-foreground">
          <p>© Rello · Free while in beta</p>
          {/* Pulled out by the button padding, so the icon lines up with the columns above. */}
          <div className="-mr-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
