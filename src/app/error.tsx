"use client";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { reportError } from "@/lib/error-reporting";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error, "page");
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-dvh items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="font-heading text-2xl">Something went wrong on this page</EmptyTitle>
          <EmptyDescription>
            Try loading the page again, or head back to your resumes. Changes that weren&apos;t saved may
            still need your attention.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center">
          <Button onClick={() => retry()}>Try again</Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/resumes" />}>
            Your resumes
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
