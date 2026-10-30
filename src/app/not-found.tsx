import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="font-heading text-2xl">This page doesn&apos;t exist</EmptyTitle>
          <EmptyDescription>The link may be old, or the page has moved.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button nativeButton={false} render={<Link href="/resumes" />}>
            Back to your resumes
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
