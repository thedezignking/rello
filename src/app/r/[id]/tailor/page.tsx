import { Suspense } from "react";
import type { Metadata } from "next";
import { EditorSkeleton } from "@/features/editor/editor";
import { TailorRoute } from "@/features/tailor/tailor-route";

export const metadata: Metadata = { title: "Tailor resume" };

export default function TailorPage({ params }: PageProps<"/r/[id]/tailor">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      {params.then(({ id }) => (
        <TailorRoute id={id} />
      ))}
    </Suspense>
  );
}
