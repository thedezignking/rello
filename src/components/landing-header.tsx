"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

/** Header for the public landing page. Signing in here takes you to your resumes. */
export function LandingHeader() {
  const router = useRouter();
  const { hasAccount, openSignIn } = useAuth();

  useEffect(() => {
    if (hasAccount) router.push("/resumes");
  }, [hasAccount, router]);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="font-heading text-[26px] leading-none font-medium tracking-tight" aria-label="Rello home">
          rello<span className="text-primary">.</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex" nativeButton={false} render={<a href="#pricing" />}>
            Pricing
          </Button>
          <Button variant="ghost" onClick={() => openSignIn()}>
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link href="/resumes" />}>
            Get started
          </Button>
        </nav>
      </div>
    </header>
  );
}
