"use client";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import Link from "next/link";
import { ResumeContentError } from "./schema";

export function downloadRecovery(content: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ content }, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "rello-resume-recovery.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ResumeReadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const recoverable = error instanceof ResumeContentError;
  return (
    <Empty role="alert" className="mx-auto max-w-xl py-12">
      <EmptyHeader>
        <EmptyTitle>
          {recoverable ? "This resume needs recovery" : "Couldn't load your resume data"}
        </EmptyTitle>
        <EmptyDescription>
          {recoverable
            ? "The stored data wasn't replaced or removed. Download a recovery copy to keep all of it before making changes."
            : "Check your connection and try again. A loading error doesn't mean your resume was deleted."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row flex-wrap justify-center">
        {recoverable && (
          <Button onClick={() => downloadRecovery(error.rawContent)}>Download recovery copy</Button>
        )}
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
        <Button variant="ghost" nativeButton={false} render={<Link href="/resumes" />}>
          Your resumes
        </Button>
      </EmptyContent>
    </Empty>
  );
}
