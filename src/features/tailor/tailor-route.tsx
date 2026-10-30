"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { EditorSkeleton } from "@/features/editor/editor";
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

  if (state.status === "loading") return <EditorSkeleton />;
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
