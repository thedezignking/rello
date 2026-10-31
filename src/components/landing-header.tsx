"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { START_LABEL } from "@/features/home/copy";
import { ThemeToggle } from "@/features/theme/theme";

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

  async function signIn() {
    if (await requireAccount()) router.push("/resumes");
  }

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
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
            <a key={l.href} href={l.href} className="transition-colors duration-150 hover:text-foreground">
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
