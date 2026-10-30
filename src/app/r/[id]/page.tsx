import { Suspense } from "react";
import type { Metadata } from "next";
import { Editor, EditorSkeleton } from "@/features/editor/editor";

export const metadata: Metadata = { title: "Edit resume" };

export default function ResumePage({ params }: PageProps<"/r/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      {params.then(({ id }) => (
        <Editor id={id} />
      ))}
    </Suspense>
  );
}
