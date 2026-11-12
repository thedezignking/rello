"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Resume } from "@/features/resumes/schema";
import { getResumeStore } from "@/features/resumes/store";
import { JobForm } from "./job-form";
import { Review } from "./review";
import type { TailorSession } from "./types";

/**
 * /r/[id]/tailor — for a tailored copy, review its suggestions;
 * for any other resume, start a new tailored copy from it.
 */
export function TailorRoute({ id }: { id: string }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "missing" } | { status: "ready"; resume: Resume; session: TailorSession | null }
  >({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const store = getResumeStore();
    Promise.all([store.get(id), store.getTailorSession(id)])
      .then(([resume, session]) => {
        if (!alive) return;
        setState(resume ? { status: "ready", resume, session } : { status: "missing" });
      })
      .catch(() => alive && setState({ status: "missing" }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.status === "loading") return <TailorSkeleton />;
  if (state.status === "missing") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>We couldn&apos;t find this resume</EmptyTitle>
            <EmptyDescription>It may have been deleted, or it belongs to another account.</EmptyDescription>
          </EmptyHeader>
          <Button nativeButton={false} render={<Link href="/resumes" />}>
            Back to your resumes
          </Button>
        </Empty>
      </div>
    );
  }
  if (state.session) return <Review key={state.session.id} resume={state.resume} initial={state.session} />;
  return <JobForm source={state.resume} />;
}

function TailorSkeleton() {
  return (
    <div className="flex h-dvh flex-col" role="status" aria-label="Loading tailoring workspace">
      <span className="sr-only">Loading your resume and suggestions…</span>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4"><Skeleton className="size-8" /><Skeleton className="h-5 w-52" /></div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden flex-1 overflow-hidden bg-muted/30 p-10 lg:block"><Skeleton className="mx-auto aspect-[794/1123] max-w-[794px] rounded-sm bg-card" /></div>
        <div className="flex w-full flex-col gap-5 border-l p-6 lg:w-[420px]">
          <Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-5 h-64 w-full" /><Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}
