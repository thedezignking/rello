"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { START_LABEL } from "@/features/home/copy";
import { ThemeToggle } from "@/features/theme/theme";
import { useScrolled } from "@/lib/use-scrolled";

/**
 * Header for the public landing page. Signing in here takes you to your
 * resumes; if you're already signed in (opened via "About Rello"), it offers
 * a way back instead.
 */
const SECTIONS = [
  { href: "#how", label: "How it works" },
  { href: "#templates", label: "Templates" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "Questions" },
];

export function LandingHeader() {
  const router = useRouter();
  const { hasAccount, requireAccount } = useAuth();
  const scrolled = useScrolled();

  async function signIn() {
    if (await requireAccount()) router.push("/resumes");
  }

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-30 border-b border-transparent bg-background/85 backdrop-blur-md transition-colors duration-200 data-scrolled:border-border"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/?home"
          className="font-heading text-[26px] leading-none font-medium tracking-tight"
          aria-label="Rello home"
        >
          rello<span className="text-primary">.</span>
        </Link>
        {/* Page sections, for scanning ahead. Hidden on phones, where the page is one short scroll. */}
        <nav aria-label="Sections" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {SECTIONS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 after:ease-(--ease-out) [@media(hover:hover)]:hover:after:scale-x-100 transition-colors duration-150 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {hasAccount ? (
            <Button nativeButton={false} render={<Link href="/resumes" />}>
              Your resumes
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={signIn}>
                Sign in
              </Button>
              <Button nativeButton={false} render={<Link href="/resumes" />}>
                {START_LABEL}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
